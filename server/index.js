'use strict';

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const { initDatabase } = require('./db');
const { validateEmailAddress, normalizeEmail } = require('./emailValidator');
const { analyzeImageGrid, SEASON_PROFILES } = require('./colorimetry');
const {
  SUPPORTED_STYLES,
  SUPPORTED_OCCASIONS,
  generatePersonalizedOutfits,
  generateWardrobeOutfits
} = require('./outfits');

function createApp(customConfig = {}) {
  const isProd = (customConfig.nodeEnv || process.env.NODE_ENV) === 'production';
  const sessionSecret = customConfig.sessionSecret || process.env.SESSION_SECRET || '';

  if (isProd && (!sessionSecret || sessionSecret.length < 32 || sessionSecret.includes('change_me'))) {
    throw new Error('[SECURITY CRITICAL] Refus de démarrer en production : SESSION_SECRET est absent, trop court (< 32 caractères) ou non modifié.');
  }

  const db = initDatabase(customConfig.dbPath);
  const app = express();

  // Initialisation conditionnelle de Stripe
  const stripeSecretKey = customConfig.stripeSecretKey ?? process.env.STRIPE_SECRET_KEY ?? '';
  const stripeWebhookSecret = customConfig.stripeWebhookSecret ?? process.env.STRIPE_WEBHOOK_SECRET ?? '';
  const pricePremiumMonthly = customConfig.pricePremiumMonthly ?? process.env.STRIPE_PRICE_PREMIUM_MONTHLY ?? '';
  const priceSingleAnalysis = customConfig.priceSingleAnalysis ?? process.env.STRIPE_PRICE_SINGLE_ANALYSIS ?? '';
  const stripeClient = customConfig.stripeClient || (stripeSecretKey ? require('stripe')(stripeSecretKey) : null);

  // Sécurité HTTP via Helmet + Content Security Policy stricte
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'blob:', 'https://images.unsplash.com'],
          connectSrc: ["'self'"],
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"]
        }
      },
      crossOriginEmbedderPolicy: false
    })
  );

  // =========================================================================
  // WEBHOOK STRIPE (Doit recevoir le corps brut avant express.json())
  // =========================================================================
  app.post('/api/billing/webhook', express.raw({ type: 'application/json', limit: '256kb' }), (req, res) => {
    if (!stripeClient || !stripeWebhookSecret) {
      return res.status(503).json({ error: 'Stripe Webhook non configuré sur ce serveur.' });
    }

    const signature = req.headers['stripe-signature'];
    if (!signature) {
      return res.status(400).json({ error: 'En-tête stripe-signature manquant.' });
    }

    let event;
    try {
      event = stripeClient.webhooks.constructEvent(req.body, signature, stripeWebhookSecret);
    } catch (err) {
      return res.status(400).json({ error: 'Signature de webhook invalide.' });
    }

    // Vérification d'idempotence atomique
    const existingEvent = db.prepare('SELECT event_id FROM stripe_events WHERE event_id = ?').get(event.id);
    if (existingEvent) {
      return res.status(200).json({ received: true, duplicate: true });
    }

    const processWebhookTx = db.transaction(() => {
      db.prepare('INSERT INTO stripe_events (event_id, event_type, event_created) VALUES (?, ?, ?)').run(
        event.id,
        event.type,
        Number(event.created) || Math.floor(Date.now() / 1000)
      );

      const eventCreated = Number(event.created) || Math.floor(Date.now() / 1000);
      const dataObj = event.data && event.data.object ? event.data.object : {};

      if (event.type === 'checkout.session.completed') {
        const userId = Number(dataObj.client_reference_id || (dataObj.metadata && dataObj.metadata.userId));
        const purchaseMode = dataObj.mode;
        if (userId) {
          const user = db.prepare('SELECT id, subscription_updated_at FROM users WHERE id = ?').get(userId);
          if (user && eventCreated >= user.subscription_updated_at) {
            if (purchaseMode === 'subscription') {
              db.prepare(`
                UPDATE users
                SET plan = 'premium',
                    stripe_customer_id = COALESCE(?, stripe_customer_id),
                    stripe_subscription_id = COALESCE(?, stripe_subscription_id),
                    subscription_status = 'active',
                    subscription_updated_at = ?,
                    updated_at = datetime('now')
                WHERE id = ?
              `).run(dataObj.customer || null, dataObj.subscription || null, eventCreated, userId);
            } else if (purchaseMode === 'payment') {
              db.prepare(`
                UPDATE users
                SET single_analysis_credits = single_analysis_credits + 1,
                    stripe_customer_id = COALESCE(?, stripe_customer_id),
                    updated_at = datetime('now')
                WHERE id = ?
              `).run(dataObj.customer || null, userId);
            }
          }
        }
      } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
        const customerId = dataObj.customer;
        const status = event.type === 'customer.subscription.deleted' ? 'canceled' : String(dataObj.status || 'canceled');
        const isActive = status === 'active' || status === 'trialing';
        const user = db.prepare('SELECT id, subscription_updated_at FROM users WHERE stripe_customer_id = ?').get(customerId);
        if (user && eventCreated >= user.subscription_updated_at) {
          db.prepare(`
            UPDATE users
            SET plan = ?,
                subscription_status = ?,
                subscription_updated_at = ?,
                updated_at = datetime('now')
            WHERE id = ?
          `).run(isActive ? 'premium' : 'free', status, eventCreated, user.id);
        }
      } else if (event.type === 'invoice.payment_failed') {
        const customerId = dataObj.customer;
        const user = db.prepare('SELECT id, subscription_updated_at FROM users WHERE stripe_customer_id = ?').get(customerId);
        if (user && eventCreated >= user.subscription_updated_at) {
          db.prepare(`
            UPDATE users
            SET plan = 'free',
                subscription_status = 'past_due',
                subscription_updated_at = ?,
                updated_at = datetime('now')
            WHERE id = ?
          `).run(eventCreated, user.id);
        }
      } else if (event.type === 'charge.refunded') {
        const customerId = dataObj.customer;
        const user = db.prepare('SELECT id FROM users WHERE stripe_customer_id = ?').get(customerId);
        if (user) {
          db.prepare(`
            UPDATE users
            SET plan = 'free',
                subscription_status = 'refunded',
                single_analysis_credits = MAX(0, single_analysis_credits - 1),
                updated_at = datetime('now')
            WHERE id = ?
          `).run(user.id);
        }
      }
    });

    processWebhookTx();
    return res.status(200).json({ received: true });
  });

  // Limite de taille des payloads JSON
  app.use(express.json({ limit: '2mb' }));

  // =========================================================================
  // UTILITAIRES CRYPTO, COOKIES, SESSIONS & RATE LIMITING
  // =========================================================================
  const rateLimitBuckets = new Map();
  function rateLimit({ windowMs = 60000, max = 20, keyPrefix = 'global' }) {
    return (req, res, next) => {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const key = `${keyPrefix}:${ip}`;
      const now = Date.now();
      const entry = rateLimitBuckets.get(key) || { count: 0, resetAt: now + windowMs };
      if (now > entry.resetAt) {
        entry.count = 0;
        entry.resetAt = now + windowMs;
      }
      entry.count += 1;
      rateLimitBuckets.set(key, entry);
      if (entry.count > max) {
        return res.status(429).json({
          error: 'Trop de requêtes. Veuillez patienter quelques instants avant de réessayer.'
        });
      }
      return next();
    };
  }

  function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const derived = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${derived}`;
  }

  function verifyPassword(password, storedHash) {
    if (!storedHash || !storedHash.includes(':')) return false;
    const [salt, keyHex] = storedHash.split(':');
    const keyBuffer = Buffer.from(keyHex, 'hex');
    const derivedBuffer = crypto.scryptSync(password, salt, 64);
    if (keyBuffer.length !== derivedBuffer.length) return false;
    return crypto.timingSafeEqual(keyBuffer, derivedBuffer);
  }

  function parseCookies(req) {
    const raw = req.headers.cookie || '';
    const out = {};
    raw.split(';').forEach((pair) => {
      const idx = pair.indexOf('=');
      if (idx > 0) {
        const k = pair.slice(0, idx).trim();
        const v = decodeURIComponent(pair.slice(idx + 1).trim());
        out[k] = v;
      }
    });
    return out;
  }

  function setSessionCookie(res, sessionId, maxAgeSec = 7 * 24 * 3600) {
    const parts = [
      `colorfit_sid=${encodeURIComponent(sessionId)}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      `Max-Age=${maxAgeSec}`
    ];
    if (isProd) parts.push('Secure');
    res.setHeader('Set-Cookie', parts.join('; '));
  }

  function clearSessionCookie(res) {
    const parts = ['colorfit_sid=', 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
    if (isProd) parts.push('Secure');
    res.setHeader('Set-Cookie', parts.join('; '));
  }

  // Middleware de résolution de session
  app.use((req, res, next) => {
    const cookies = parseCookies(req);
    const sid = cookies.colorfit_sid;
    req.sessionUser = null;
    req.sessionData = null;

    if (sid) {
      const now = Date.now();
      const row = db.prepare(`
        SELECT s.id AS session_id, s.csrf_token, s.expires_at,
               u.id, u.email, u.email_verified, u.plan, u.single_analysis_credits,
               u.subscription_status, u.preferences_json, u.privacy_settings_json, u.created_at
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.id = ?
      `).get(sid);

      if (row && row.expires_at > now) {
        req.sessionData = { id: row.session_id, csrfToken: row.csrf_token, expiresAt: row.expires_at };
        req.sessionUser = {
          id: row.id,
          email: row.email,
          emailVerified: Boolean(row.email_verified),
          plan: row.plan,
          singleAnalysisCredits: row.single_analysis_credits,
          subscriptionStatus: row.subscription_status,
          preferences: JSON.parse(row.preferences_json || '{}'),
          privacySettings: JSON.parse(row.privacy_settings_json || '{}'),
          createdAt: row.created_at
        };
      } else if (row) {
        db.prepare('DELETE FROM sessions WHERE id = ?').run(sid);
      }
    }
    next();
  });

  function requireAuth(req, res, next) {
    if (!req.sessionUser) {
      return res.status(401).json({ error: 'Authentification requise. Veuillez vous connecter.' });
    }
    return next();
  }

  function requireCsrf(req, res, next) {
    if (!req.sessionData) {
      return res.status(401).json({ error: 'Session expirée ou absente.' });
    }
    const token = req.headers['x-csrf-token'] || (req.body && req.body._csrf);
    if (!token || token !== req.sessionData.csrfToken) {
      return res.status(403).json({ error: 'Jeton de sécurité CSRF invalide ou manquant.' });
    }
    return next();
  }

  // =========================================================================
  // ROUTES D'AUTHENTIFICATION ET DE GESTION DE COMPTE (Section 3 & 11)
  // =========================================================================
  app.post('/api/auth/register', rateLimit({ windowMs: 60000, max: 10, keyPrefix: 'register' }), async (req, res) => {
    try {
      const { email, password } = req.body || {};
      const emailCheck = await validateEmailAddress(email);
      if (!emailCheck.valid) {
        return res.status(400).json({ error: emailCheck.reason, suggestion: emailCheck.suggestion || null });
      }

      if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
        return res.status(400).json({ error: 'Le mot de passe doit contenir entre 8 et 128 caractères.' });
      }

      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(emailCheck.normalizedEmail);
      if (existing) {
        return res.status(409).json({ error: 'Un compte existe déjà avec cette adresse email.' });
      }

      const passwordHash = hashPassword(password);
      const rawVerifyToken = crypto.randomBytes(32).toString('hex');
      const verifyTokenHash = crypto.createHash('sha256').update(rawVerifyToken).digest('hex');
      const verifyExpiresAt = Date.now() + 24 * 3600 * 1000;

      const info = db.prepare(`
        INSERT INTO users (email, password_hash, email_verified, verification_token_hash, verification_expires_at)
        VALUES (?, ?, 0, ?, ?)
      `).run(emailCheck.normalizedEmail, passwordHash, verifyTokenHash, verifyExpiresAt);

      const userId = Number(info.lastInsertRowid);
      const sessionId = crypto.randomBytes(32).toString('hex');
      const csrfToken = crypto.randomBytes(24).toString('hex');
      const now = Date.now();
      const expiresAt = now + 7 * 24 * 3600 * 1000;

      db.prepare(`
        INSERT INTO sessions (id, user_id, csrf_token, expires_at, created_at, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(sessionId, userId, csrfToken, expiresAt, now, req.ip || '', String(req.headers['user-agent'] || '').slice(0, 200));

      setSessionCookie(res, sessionId);

      const verifyUrl = `/api/auth/verify-email?token=${rawVerifyToken}`;
      const responsePayload = {
        ok: true,
        message: 'Compte créé avec succès. Veuillez confirmer votre adresse email via le lien de vérification.',
        csrfToken,
        user: {
          id: userId,
          email: emailCheck.normalizedEmail,
          emailVerified: false,
          plan: 'free'
        }
      };

      if (!isProd) {
        responsePayload.devVerificationUrl = verifyUrl;
      }

      return res.status(201).json(responsePayload);
    } catch (err) {
      return res.status(500).json({ error: 'Erreur interne lors de l\'inscription.' });
    }
  });

  app.get('/api/auth/verify-email', (req, res) => {
    const rawToken = String(req.query.token || '').trim();
    if (!rawToken) {
      return res.status(400).json({ error: 'Lien de confirmation manquant.' });
    }
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const user = db.prepare(`
      SELECT id, email_verified, verification_expires_at
      FROM users
      WHERE verification_token_hash = ?
    `).get(tokenHash);

    if (!user) {
      return res.status(400).json({ error: 'Lien de confirmation invalide ou déjà utilisé.' });
    }
    if (Date.now() > Number(user.verification_expires_at)) {
      return res.status(410).json({ error: 'Ce lien de confirmation a expiré. Demandez un nouveau lien depuis Mon compte.' });
    }

    db.prepare(`
      UPDATE users
      SET email_verified = 1,
          verification_token_hash = NULL,
          verification_expires_at = NULL,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(user.id);

    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.json({ ok: true, message: 'Votre adresse email est désormais confirmée.' });
    }
    return res.redirect('/?email_verified=1');
  });

  app.post('/api/auth/login', rateLimit({ windowMs: 60000, max: 10, keyPrefix: 'login' }), (req, res) => {
    const email = normalizeEmail(req.body && req.body.email);
    const password = String((req.body && req.body.password) || '');

    if (!email || !password) {
      return res.status(400).json({ error: 'Veuillez renseigner votre email et votre mot de passe.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Identifiants incorrects.' });
    }

    if (user.locked_until && Date.now() < user.locked_until) {
      return res.status(429).json({
        error: 'Compte temporairement verrouillé suite à plusieurs tentatives infructueuses. Réessayez dans quelques minutes.'
      });
    }

    if (!verifyPassword(password, user.password_hash)) {
      const attempts = (user.failed_login_attempts || 0) + 1;
      const lockUntil = attempts >= 5 ? Date.now() + 10 * 60 * 1000 : 0;
      db.prepare('UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?').run(attempts, lockUntil, user.id);
      return res.status(401).json({ error: 'Identifiants incorrects.' });
    }

    // Réinitialiser le compteur d'échecs et effectuer une rotation de l'ID de session
    db.prepare('UPDATE users SET failed_login_attempts = 0, locked_until = 0 WHERE id = ?').run(user.id);
    if (req.sessionData && req.sessionData.id) {
      db.prepare('DELETE FROM sessions WHERE id = ?').run(req.sessionData.id);
    }

    const sessionId = crypto.randomBytes(32).toString('hex');
    const csrfToken = crypto.randomBytes(24).toString('hex');
    const now = Date.now();
    const expiresAt = now + 7 * 24 * 3600 * 1000;

    db.prepare(`
      INSERT INTO sessions (id, user_id, csrf_token, expires_at, created_at, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(sessionId, user.id, csrfToken, expiresAt, now, req.ip || '', String(req.headers['user-agent'] || '').slice(0, 200));

    setSessionCookie(res, sessionId);

    return res.json({
      ok: true,
      csrfToken,
      user: {
        id: user.id,
        email: user.email,
        emailVerified: Boolean(user.email_verified),
        plan: user.plan
      }
    });
  });

  app.post('/api/auth/logout', requireAuth, requireCsrf, (req, res) => {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(req.sessionData.id);
    clearSessionCookie(res);
    return res.json({ ok: true, message: 'Vous avez été déconnecté.' });
  });

  // Consultation de l'espace « Mon compte » (ne déclenche jamais de déconnexion)
  app.get('/api/account/me', requireAuth, (req, res) => {
    const userId = req.sessionUser.id;
    const analysisCountRow = db.prepare('SELECT COUNT(*) AS count FROM color_analyses WHERE user_id = ?').get(userId);
    const latestAnalysis = db.prepare(`
      SELECT id, season_id, season_name, secondary_season_name, confidence_score, confidence_label,
             metrics_json, palette_json, quality_warnings_json, created_at
      FROM color_analyses
      WHERE user_id = ?
      ORDER BY id DESC
      LIMIT 1
    `).get(userId);

    const wardrobeCountRow = db.prepare('SELECT COUNT(*) AS count FROM wardrobe_items WHERE user_id = ?').get(userId);

    return res.json({
      ok: true,
      csrfToken: req.sessionData.csrfToken,
      account: {
        id: req.sessionUser.id,
        email: req.sessionUser.email,
        emailVerified: req.sessionUser.emailVerified,
        plan: req.sessionUser.plan,
        singleAnalysisCredits: req.sessionUser.singleAnalysisCredits,
        subscriptionStatus: req.sessionUser.subscriptionStatus,
        analysisCount: analysisCountRow ? analysisCountRow.count : 0,
        wardrobeCount: wardrobeCountRow ? wardrobeCountRow.count : 0,
        latestAnalysis: latestAnalysis ? {
          id: latestAnalysis.id,
          seasonId: latestAnalysis.season_id,
          seasonName: latestAnalysis.season_name,
          secondarySeasonName: latestAnalysis.secondary_season_name,
          confidenceScore: latestAnalysis.confidence_score,
          confidenceLabel: latestAnalysis.confidence_label,
          metrics: JSON.parse(latestAnalysis.metrics_json || '{}'),
          palette: JSON.parse(latestAnalysis.palette_json || '{}'),
          createdAt: latestAnalysis.created_at
        } : null,
        preferences: req.sessionUser.preferences,
        privacySettings: req.sessionUser.privacySettings,
        createdAt: req.sessionUser.createdAt
      }
    });
  });

  app.put('/api/account/preferences', requireAuth, requireCsrf, (req, res) => {
    const prefs = req.body && typeof req.body === 'object' ? req.body : {};
    const sanitized = {
      style: SUPPORTED_STYLES.includes(prefs.style) ? prefs.style : 'Casual',
      occasion: SUPPORTED_OCCASIONS.includes(prefs.occasion) ? prefs.occasion : 'Quotidien',
      budget: Math.max(30, Math.min(5000, Number(prefs.budget) || 180)),
      likedColors: Array.isArray(prefs.likedColors) ? prefs.likedColors.slice(0, 10).map(String) : [],
      rejectedColors: Array.isArray(prefs.rejectedColors) ? prefs.rejectedColors.slice(0, 10).map(String) : [],
      preferredBrands: Array.isArray(prefs.preferredBrands) ? prefs.preferredBrands.slice(0, 10).map(String) : []
    };

    db.prepare(`
      UPDATE users
      SET preferences_json = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(JSON.stringify(sanitized), req.sessionUser.id);

    return res.json({ ok: true, preferences: sanitized });
  });

  app.put('/api/account/privacy', requireAuth, requireCsrf, (req, res) => {
    const body = req.body || {};
    const privacy = {
      saveHistory: Boolean(body.saveHistory ?? true),
      analyticsConsent: Boolean(body.analyticsConsent ?? false),
      marketingConsent: Boolean(body.marketingConsent ?? false)
    };

    db.prepare(`
      UPDATE users
      SET privacy_settings_json = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(JSON.stringify(privacy), req.sessionUser.id);

    return res.json({ ok: true, privacySettings: privacy });
  });

  // Export RGPD portable de toutes les données personnelles de l'utilisateur
  app.get('/api/account/export', requireAuth, (req, res) => {
    const userId = req.sessionUser.id;
    const analyses = db.prepare('SELECT * FROM color_analyses WHERE user_id = ? ORDER BY id DESC').all(userId);
    const wardrobe = db.prepare('SELECT * FROM wardrobe_items WHERE user_id = ? ORDER BY id DESC').all(userId);

    const exportBundle = {
      exportedAt: new Date().toISOString(),
      service: 'ColorFit',
      retentionPolicy: {
        unverifiedAccounts: '7 jours',
        savedAnalyses: 'Jusqu\'à suppression par l\'utilisateur ou clôture du compte',
        uploadedPhotos: 'Traitement en mémoire locale/éphémère, non conservées sur nos serveurs pour la colorimétrie'
      },
      user: req.sessionUser,
      analyses,
      wardrobe
    };

    res.setHeader('Content-Disposition', `attachment; filename="colorfit-rgpd-export-${userId}.json"`);
    return res.json(exportBundle);
  });

  // Suppression totale du compte et des données associées (RGPD Droit à l'effacement)
  app.delete('/api/account', requireAuth, requireCsrf, (req, res) => {
    const userId = req.sessionUser.id;
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    clearSessionCookie(res);
    return res.json({ ok: true, message: 'Votre compte et toutes vos données associées ont été définitivement supprimés.' });
  });

  // =========================================================================
  // ANALYSE COLORIMÉTRIQUE ET HISTORIQUE
  // =========================================================================
  app.post('/api/colorimetry/analyze', rateLimit({ windowMs: 60000, max: 15, keyPrefix: 'analyze' }), (req, res) => {
    const result = analyzeImageGrid(req.body);
    if (!result.ok) {
      return res.status(422).json(result);
    }

    // Si l'utilisateur est connecté et autorise l'enregistrement de son historique
    if (req.sessionUser && req.sessionUser.privacySettings.saveHistory !== false) {
      const info = db.prepare(`
        INSERT INTO color_analyses (
          user_id, season_id, season_name, secondary_season_id, secondary_season_name,
          confidence_score, confidence_label, metrics_json, palette_json, quality_warnings_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        req.sessionUser.id,
        result.seasonId,
        result.seasonName,
        result.secondarySeason ? result.secondarySeason.id : null,
        result.secondarySeason ? result.secondarySeason.name : null,
        result.confidence.score,
        result.confidence.label,
        JSON.stringify(result.metrics),
        JSON.stringify(result.profile),
        JSON.stringify(result.qualityWarnings || [])
      );
      result.analysisId = Number(info.lastInsertRowid);
    }

    return res.json(result);
  });

  app.delete('/api/analyses/:id', requireAuth, requireCsrf, (req, res) => {
    const analysisId = Number(req.params.id);
    const info = db.prepare('DELETE FROM color_analyses WHERE id = ? AND user_id = ?').run(analysisId, req.sessionUser.id);
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Analyse introuvable ou accès refusé.' });
    }
    return res.json({ ok: true });
  });

  // =========================================================================
  // RECOMMANDATIONS D'OUTFITS
  // =========================================================================
  app.post('/api/outfits/generate', (req, res) => {
    const outfits = generatePersonalizedOutfits(req.body || {});
    return res.json({ ok: true, outfits });
  });

  // =========================================================================
  // DRESSING VIRTUEL (Isolation stricte par utilisateur)
  // =========================================================================
  app.get('/api/wardrobe', requireAuth, (req, res) => {
    const items = db.prepare('SELECT * FROM wardrobe_items WHERE user_id = ? ORDER BY is_favorite DESC, id DESC').all(req.sessionUser.id);
    return res.json({ ok: true, items });
  });

  app.post('/api/wardrobe', requireAuth, requireCsrf, (req, res) => {
    const b = req.body || {};
    const name = String(b.name || '').trim().slice(0, 100);
    const category = ['Haut', 'Bas', 'Chaussures', 'Veste', 'Accessoire'].includes(b.category) ? b.category : 'Haut';
    const primaryHex = /^#[0-9A-Fa-f]{6}$/.test(b.primaryColorHex) ? b.primaryColorHex : '#3D5A80';
    const primaryName = String(b.primaryColorName || 'Couleur détectée').trim().slice(0, 60);
    const secondaryHex = /^#[0-9A-Fa-f]{6}$/.test(b.secondaryColorHex) ? b.secondaryColorHex : null;
    const style = SUPPORTED_STYLES.includes(b.style) ? b.style : 'Casual';
    const seasonTag = String(b.seasonTag || 'Toutes saisons').trim().slice(0, 40);
    const brand = b.brand ? String(b.brand).trim().slice(0, 60) : null;
    const size = b.size ? String(b.size).trim().slice(0, 20) : null;
    const price = b.price !== undefined && b.price !== '' ? Math.max(0, Number(b.price) || 0) : null;
    const imageDataUrl = typeof b.imageDataUrl === 'string' && b.imageDataUrl.startsWith('data:image/')
      ? b.imageDataUrl.slice(0, 500000)
      : null;

    if (!name) {
      return res.status(400).json({ error: 'Veuillez donner un nom à ce vêtement.' });
    }

    const info = db.prepare(`
      INSERT INTO wardrobe_items (
        user_id, name, category, primary_color_hex, primary_color_name,
        secondary_color_hex, style, season_tag, brand, size, price, image_data_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.sessionUser.id, name, category, primaryHex, primaryName,
      secondaryHex, style, seasonTag, brand, size, price, imageDataUrl
    );

    const created = db.prepare('SELECT * FROM wardrobe_items WHERE id = ? AND user_id = ?').get(info.lastInsertRowid, req.sessionUser.id);
    return res.status(201).json({ ok: true, item: created });
  });

  app.put('/api/wardrobe/:id', requireAuth, requireCsrf, (req, res) => {
    const itemId = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM wardrobe_items WHERE id = ? AND user_id = ?').get(itemId, req.sessionUser.id);
    if (!existing) {
      return res.status(404).json({ error: 'Vêtement introuvable ou accès non autorisé.' });
    }

    const b = req.body || {};
    const name = b.name !== undefined ? String(b.name).trim().slice(0, 100) : existing.name;
    const category = ['Haut', 'Bas', 'Chaussures', 'Veste', 'Accessoire'].includes(b.category) ? b.category : existing.category;
    const primaryHex = /^#[0-9A-Fa-f]{6}$/.test(b.primaryColorHex) ? b.primaryColorHex : existing.primary_color_hex;
    const primaryName = b.primaryColorName !== undefined ? String(b.primaryColorName).trim().slice(0, 60) : existing.primary_color_name;
    const style = SUPPORTED_STYLES.includes(b.style) ? b.style : existing.style;
    const seasonTag = b.seasonTag !== undefined ? String(b.seasonTag).trim().slice(0, 40) : existing.season_tag;
    const brand = b.brand !== undefined ? String(b.brand || '').trim().slice(0, 60) : existing.brand;
    const size = b.size !== undefined ? String(b.size || '').trim().slice(0, 20) : existing.size;
    const isFavorite = b.isFavorite !== undefined ? (b.isFavorite ? 1 : 0) : existing.is_favorite;

    db.prepare(`
      UPDATE wardrobe_items
      SET name = ?, category = ?, primary_color_hex = ?, primary_color_name = ?,
          style = ?, season_tag = ?, brand = ?, size = ?, is_favorite = ?, updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).run(name, category, primaryHex, primaryName, style, seasonTag, brand, size, isFavorite, itemId, req.sessionUser.id);

    const updated = db.prepare('SELECT * FROM wardrobe_items WHERE id = ? AND user_id = ?').get(itemId, req.sessionUser.id);
    return res.json({ ok: true, item: updated });
  });

  app.delete('/api/wardrobe/:id', requireAuth, requireCsrf, (req, res) => {
    const itemId = Number(req.params.id);
    const info = db.prepare('DELETE FROM wardrobe_items WHERE id = ? AND user_id = ?').run(itemId, req.sessionUser.id);
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Vêtement introuvable ou accès non autorisé.' });
    }
    return res.json({ ok: true });
  });

  app.post('/api/wardrobe/outfits', requireAuth, requireCsrf, (req, res) => {
    const items = db.prepare('SELECT * FROM wardrobe_items WHERE user_id = ?').all(req.sessionUser.id);
    const seasonId = (req.body && req.body.seasonId) || 'printemps_chaud';
    const result = generateWardrobeOutfits(items, seasonId);
    return res.json(result);
  });

  // =========================================================================
  // CATALOGUE DE PRODUITS RÉELLEMENT ACHETABLES (Section 8)
  // =========================================================================
  app.get('/api/products', (req, res) => {
    const productsPath = path.join(__dirname, '..', 'data', 'products.json');
    let products = [];
    try {
      if (fs.existsSync(productsPath)) {
        products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
      }
    } catch (err) {
      products = [];
    }

    const { category, style, maxPrice, retailer, color } = req.query;
    let filtered = products.filter((p) => p && p.officialUrl && p.officialUrl.startsWith('https://'));

    if (category) filtered = filtered.filter((p) => p.category.toLowerCase() === String(category).toLowerCase());
    if (style) filtered = filtered.filter((p) => p.style.toLowerCase() === String(style).toLowerCase());
    if (retailer) filtered = filtered.filter((p) => p.retailer.toLowerCase().includes(String(retailer).toLowerCase()));
    if (color) filtered = filtered.filter((p) => p.colorName.toLowerCase().includes(String(color).toLowerCase()));
    if (maxPrice && !Number.isNaN(Number(maxPrice))) {
      filtered = filtered.filter((p) => Number(p.price) <= Number(maxPrice));
    }

    // Signalement transparent de la fraîcheur des données (aucun tri par commission d'affiliation)
    const nowMs = Date.now();
    const enriched = filtered.map((p) => {
      const updatedMs = Date.parse(p.lastUpdatedAt || '');
      const isStale = Number.isNaN(updatedMs) || (nowMs - updatedMs) > 30 * 24 * 3600 * 1000;
      return {
        ...p,
        isStale,
        availabilityNote: p.availability || 'Disponibilité et tailles à vérifier sur la boutique officielle'
      };
    });

    return res.json({
      ok: true,
      transparencyNotice: 'Les prix et disponibilités proviennent du dernier relevé horodaté. Les liens affiliés éventuels sont signalés et n\'influencent jamais l\'ordre des recommandations.',
      products: enriched
    });
  });

  // =========================================================================
  // PAIEMENTS STRIPE ET GESTION DE L'ABONNEMENT (Section 9)
  // =========================================================================
  app.get('/api/billing/status', (req, res) => {
    const configured = Boolean(stripeClient && (pricePremiumMonthly || priceSingleAnalysis));
    return res.json({
      ok: true,
      stripeConfigured: configured,
      pricingHypotheses: {
        free: { priceEur: 0, label: 'Offre Gratuite (Découverte)' },
        premiumMonthly: { priceEur: 5.99, label: 'Abonnement Premium (5,99 €/mois — tarif envisagé)' },
        singleAnalysis: { priceEur: 9.99, label: 'Analyse complète à l\'unité sans abonnement (9,99 € — tarif envisagé)' }
      }
    });
  });

  app.post('/api/billing/checkout', requireAuth, requireCsrf, async (req, res) => {
    if (!stripeClient) {
      return res.status(503).json({
        error: 'Les paiements en ligne ne sont pas encore activés sur cet environnement (clés Stripe absentes).'
      });
    }

    const offerType = (req.body && req.body.offerType) === 'single' ? 'single' : 'subscription';
    const priceId = offerType === 'single' ? priceSingleAnalysis : pricePremiumMonthly;

    if (!priceId) {
      return res.status(503).json({
        error: `L'identifiant de tarif Stripe (${offerType}) n'est pas configuré côté serveur.`
      });
    }

    const baseUrl = process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`;
    try {
      const session = await stripeClient.checkout.sessions.create({
        mode: offerType === 'single' ? 'payment' : 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        client_reference_id: String(req.sessionUser.id),
        customer_email: req.sessionUser.email,
        metadata: { userId: String(req.sessionUser.id), offerType },
        success_url: `${baseUrl}/?checkout_notice=pending_webhook`,
        cancel_url: `${baseUrl}/?checkout_notice=canceled`
      });

      return res.json({ ok: true, checkoutUrl: session.url, sessionId: session.id });
    } catch (err) {
      return res.status(502).json({ error: 'Impossible d\'initialiser la session Stripe Checkout.' });
    }
  });

  app.post('/api/billing/portal', requireAuth, requireCsrf, async (req, res) => {
    if (!stripeClient) {
      return res.status(503).json({ error: 'Le portail de facturation Stripe n\'est pas configuré.' });
    }
    const userRow = db.prepare('SELECT stripe_customer_id FROM users WHERE id = ?').get(req.sessionUser.id);
    if (!userRow || !userRow.stripe_customer_id) {
      return res.status(400).json({ error: 'Aucun abonnement Stripe actif n\'est rattaché à votre compte.' });
    }
    const baseUrl = process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`;
    try {
      const portal = await stripeClient.billingPortal.sessions.create({
        customer: userRow.stripe_customer_id,
        return_url: `${baseUrl}/`
      });
      return res.json({ ok: true, portalUrl: portal.url });
    } catch (err) {
      return res.status(502).json({ error: 'Impossible d\'ouvrir le portail de gestion Stripe.' });
    }
  });

  // =========================================================================
  // FICHIERS STATIQUES FRONTEND ET GESTION GLOBALE DES ERREURS
  // =========================================================================
  const publicDir = path.join(__dirname, '..', 'public');
  app.use(express.static(publicDir));

  app.use((err, req, res, next) => {
    // Ne jamais divulguer la stack trace ou les chemins internes au client
    return res.status(500).json({
      error: 'Une erreur inattendue est survenue côté serveur.'
    });
  });

  return { app, db };
}

if (require.main === module) {
  const { app } = createApp();
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.log(`[ColorFit] Serveur démarré sur http://localhost:${port}`);
  });
}

module.exports = { createApp };
