import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import Stripe from 'stripe';
import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dataDir = path.resolve(root, 'data');
fs.mkdirSync(dataDir, { recursive: true });
const productCatalogPath = path.join(dataDir, 'products.json');
const productCatalog = fs.existsSync(productCatalogPath) ? JSON.parse(fs.readFileSync(productCatalogPath, 'utf8')) : [];
const productCatalogMetaPath = path.join(dataDir, 'catalog-meta.json');
const productCatalogMeta = fs.existsSync(productCatalogMetaPath) ? JSON.parse(fs.readFileSync(productCatalogMetaPath, 'utf8')) : {};

const PORT = Number(process.env.PORT || 3000);
const NODE_ENV = process.env.NODE_ENV || 'development';
const originInput = process.env.APP_ORIGIN || `http://localhost:${PORT}`;
let parsedOrigin;
try { parsedOrigin = new URL(originInput); } catch { throw new Error('APP_ORIGIN must be a valid URL.'); }
if (parsedOrigin.pathname !== '/' || parsedOrigin.search || parsedOrigin.hash) throw new Error('APP_ORIGIN must contain only the site origin, without a path.');
const ORIGIN = parsedOrigin.origin;
const sessionSecret = process.env.SESSION_SECRET;
if (NODE_ENV === 'production') {
  if (!sessionSecret || sessionSecret.length < 32) throw new Error('Production requires a stable SESSION_SECRET of at least 32 characters.');
  if (parsedOrigin.protocol !== 'https:') throw new Error('Production requires an HTTPS APP_ORIGIN.');
}
const SESSION_SECRET = sessionSecret || crypto.randomBytes(48).toString('base64url');
const databasePath = process.env.DB_PATH ? path.resolve(process.env.DB_PATH) : path.join(dataDir, 'colorfit.db');
if (NODE_ENV === 'production' && (!process.env.DB_PATH || !path.isAbsolute(process.env.DB_PATH))) {
  throw new Error('Production requires an absolute DB_PATH on persistent storage.');
}
fs.mkdirSync(path.dirname(databasePath), { recursive: true });
const db = new Database(databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');
db.exec(`
CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY,
 email TEXT NOT NULL UNIQUE,
 password_hash TEXT NOT NULL,
 plan TEXT NOT NULL DEFAULT 'free' CHECK(plan IN ('free','premium')),
 stripe_customer_id TEXT,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS analyses (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 profile TEXT NOT NULL,
 palette_json TEXT NOT NULL,
 preferences_json TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS entitlements (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 stripe_subscription_id TEXT UNIQUE,
 status TEXT NOT NULL,
 current_period_end INTEGER,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
);
`);

const paymentMode = process.env.PAYMENTS_MODE || 'test';
const stripeFields = [process.env.STRIPE_SECRET_KEY, process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_PRICE_ID];
const stripeIsConfigured = stripeFields.every(Boolean);
if (NODE_ENV === 'production') {
  if (!['test', 'live'].includes(paymentMode)) throw new Error('PAYMENTS_MODE must be "test" or "live".');
  if (!stripeIsConfigured) throw new Error('Production requires Stripe secret, webhook, and price settings.');
  const expectedKeyPrefix = paymentMode === 'live' ? 'sk_live_' : 'sk_test_';
  if (!process.env.STRIPE_SECRET_KEY.startsWith(expectedKeyPrefix)) throw new Error(`PAYMENTS_MODE=${paymentMode} does not match STRIPE_SECRET_KEY.`);
  if (!process.env.STRIPE_WEBHOOK_SECRET.startsWith('whsec_') || !process.env.STRIPE_PRICE_ID.startsWith('price_')) {
    throw new Error('Stripe webhook and price settings appear invalid.');
  }
}
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", 'https://api.stripe.com'],
      frameSrc: ["'self'", 'https://js.stripe.com', 'https://hooks.stripe.com'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'", 'https://checkout.stripe.com'],
      frameAncestors: ["'none'"]
    }
  },
  referrerPolicy: { policy: 'no-referrer' },
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' }
}));
app.use(compression());

// Stripe requires the raw body for signature verification. Keep this route before express.json().
app.post('/api/stripe/webhook', express.raw({ type: 'application/json', limit: '256kb' }), async (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return res.status(503).send('Payments not configured');
  let event;
  try { event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET); }
  catch { return res.status(400).send('Invalid signature'); }
  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      if (userId && session.subscription) {
        const sub = await stripe.subscriptions.retrieve(session.subscription);
        upsertEntitlement(userId, sub);
        if (session.customer) db.prepare('UPDATE users SET stripe_customer_id=?, updated_at=? WHERE id=?').run(String(session.customer), now(), userId);
      }
    }
    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created' || event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const userId = sub.metadata?.userId;
      if (userId) upsertEntitlement(userId, sub);
    }
    return res.json({ received: true });
  } catch { return res.status(500).send('Webhook processing failed'); }
});

app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: false, limit: '16kb' }));

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 180, standardHeaders: 'draft-8', legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Trop de tentatives. Réessaie plus tard.' } });
app.use('/api/', apiLimiter);

const productColorRules = [
  ['black', /black|charcoal|onyx/i], ['white', /white|ivory|cream|off.?white/i],
  ['brown', /brown|mocha|camel|caramel|tan|taupe|coffee|chocolate|khaki/i],
  ['red', /red|burgundy|wine|scarlet|berry/i], ['pink', /pink|rose|blush|fuchsia/i],
  ['orange', /orange|coral|peach|apricot|rust|terracotta/i], ['yellow', /yellow|gold|mustard/i],
  ['green', /green|olive|sage|moss|matcha|army/i], ['blue', /blue|navy|teal|turquoise|aqua/i],
  ['purple', /purple|violet|lavender|lilac/i], ['gray', /gray|grey|silver|charcoal/i]
];
function colorFamiliesFromLabel(label) { return productColorRules.filter(([, pattern]) => pattern.test(label || '')).map(([family]) => family); }
function colorFamiliesFromHex(hex) {
  const n = Number.parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min, light = (max + min) / 510;
  if (light < .14) return ['black'];
  if (light > .88 && delta < 45) return ['white'];
  if (delta < 28) return light < .43 ? ['gray','black'] : ['gray','white'];
  let hue = 0;
  if (max === r) hue = 60 * (((g - b) / delta) % 6);
  else if (max === g) hue = 60 * ((b - r) / delta + 2);
  else hue = 60 * ((r - g) / delta + 4);
  if (hue < 0) hue += 360;
  if (hue < 12 || hue >= 345) return ['red','pink'];
  if (hue < 28) return ['orange','brown'];
  if (hue < 48) return ['orange','yellow','brown'];
  if (hue < 72) return ['yellow','green'];
  if (hue < 165) return ['green'];
  if (hue < 205) return ['blue','green'];
  if (hue < 255) return ['blue'];
  if (hue < 290) return ['purple'];
  if (hue < 330) return ['pink','purple'];
  return ['pink','red'];
}
app.get('/api/products', (req, res) => {
  const palette = String(req.query.palette || '').split(',').filter(hex => /^#[0-9a-f]{6}$/i.test(hex)).slice(0, 12);
  const preferredFamilies = new Set(palette.flatMap(colorFamiliesFromHex));
  const budgetCaps = { '€': 45, '€€': 90, '€€€': 160 };
  const budget = String(req.query.budget || '');
  const cap = budgetCaps[budget] || Infinity; // Catalog prices are USD; caps are approximate budget bands.
  const requestedLimit = Number.parseInt(req.query.limit || '12', 10);
  const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(24, requestedLimit)) : 12;
  const products = productCatalog.flatMap(product => {
    const variants = (product.variants || []).filter(variant => variant.price_usd <= cap);
    if (!variants.length) return [];
    const variant = variants.map(item => ({ ...item, families: colorFamiliesFromLabel(item.color) }))
      .map(item => ({ ...item, colorScore: item.families.filter(family => preferredFamilies.has(family)).length }))
      .sort((a, b) => b.colorScore - a.colorScore)[0];
    return [{ id: product.id, title: product.title, type: product.type, url: product.url, image: product.image,
      price: variant.price_usd, currency: 'USD', color: variant.color, size: variant.size,
      colorMatch: preferredFamilies.size > 0 && variant.colorScore > 0, colorScore: variant.colorScore }];
  });
  products.sort((a, b) => b.colorScore - a.colorScore);
  const matches = products.filter(product => product.colorMatch);
  const results = (matches.length >= 3 ? matches : products).slice(0, limit);
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.json({ products: results, matchedPalette: matches.length >= 3, currency: 'USD', source: 'Livostyle', syncedAt: productCatalogMeta.syncedAt || null });
});

function now() { return Date.now(); }
function id() { return crypto.randomUUID(); }
function sign(value) {
  const mac = crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('base64url');
  return `${value}.${mac}`;
}
function verify(token) {
  if (!token) return null;
  const [value, mac] = token.split('.');
  if (!value || !mac || mac.length !== 43) return null;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  const [userId, exp] = value.split(':');
  if (!userId || Number(exp) < now()) return null;
  return userId;
}
function setSession(res, userId) {
  const token = sign(`${userId}:${now() + 7 * 24 * 60 * 60 * 1000}`);
  const attrs = `HttpOnly; Path=/; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
  res.setHeader('Set-Cookie', `cf_session=${token}; ${attrs}`);
}
function clearSession(res) { res.setHeader('Set-Cookie', 'cf_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0' + (process.env.NODE_ENV === 'production' ? '; Secure' : '')); }
function auth(req, res, next) {
  const userId = verify(req.headers.cookie?.split(';').map(x => x.trim()).find(x => x.startsWith('cf_session='))?.slice(11));
  if (!userId) return res.status(401).json({ error: 'Authentification requise.' });
  const user = db.prepare('SELECT id, email, plan FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(401).json({ error: 'Session invalide.' });
  req.user = user; next();
}
function sameOrigin(req, res, next) {
  if (['GET','HEAD','OPTIONS'].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (origin && origin !== ORIGIN) return res.status(403).json({ error: 'Origine refusée.' });
  next();
}
function upsertEntitlement(userId, sub) {
  const status = ['active','trialing','past_due'].includes(sub.status) ? 'active' : 'inactive';
  const end = sub.current_period_end ? sub.current_period_end * 1000 : null;
  const existing = db.prepare('SELECT id FROM entitlements WHERE stripe_subscription_id = ?').get(sub.id);
  const tx = db.transaction(() => {
    if (existing) db.prepare('UPDATE entitlements SET status=?, current_period_end=?, updated_at=? WHERE stripe_subscription_id=?').run(status, end, now(), sub.id);
    else db.prepare('INSERT INTO entitlements(id,user_id,stripe_subscription_id,status,current_period_end,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').run(id(), userId, sub.id, status, end, now(), now());
    db.prepare('UPDATE users SET plan=?, updated_at=? WHERE id=?').run(status === 'active' ? 'premium' : 'free', now(), userId);
  }); tx();
}

const disposableDomains = new Set([
  'mailinator.com','guerrillamail.com','10minutemail.com','temp-mail.org','tempmail.com',
  'yopmail.com','trashmail.com','getnada.com','dispostable.com','maildrop.cc'
]);
const commonEmailDomains = [
  'gmail.com','googlemail.com','outlook.com','hotmail.com','live.com','yahoo.com','yahoo.fr',
  'icloud.com','proton.me','protonmail.com','orange.fr','wanadoo.fr','laposte.net','free.fr',
  'sfr.fr','gmx.com','gmx.fr','zoho.com'
];
const credentials = z.object({
  email: z.string().trim().email().max(254).transform(v => v.toLowerCase()),
  password: z.string().min(10).max(128)
});
function emailDomainSuggestion(domain) {
  for (const known of commonEmailDomains) {
    if (domain === known) continue;
    if (domain.length === known.length && [...domain].filter((char, i) => char !== known[i]).length === 1) return known;
    if (Math.abs(domain.length - known.length) === 1) {
      let i = 0, j = 0, differences = 0;
      while (i < domain.length && j < known.length) {
        if (domain[i] === known[j]) { i++; j++; continue; }
        differences++;
        if (differences > 1) break;
        if (domain.length > known.length) i++; else j++;
      }
      if (i < domain.length || j < known.length) differences++;
      if (differences === 1) return known;
    }
    // Catch adjacent transpositions such as "gmial.com" without flagging broad lookalikes.
    if (domain.length === known.length) {
      for (let i = 0; i < domain.length - 1; i++) {
        if (domain[i] !== domain[i + 1] && domain[i] === known[i + 1] && domain[i + 1] === known[i] && domain.slice(0, i) === known.slice(0, i) && domain.slice(i + 2) === known.slice(i + 2)) return known;
      }
    }
  }
  return null;
}
async function validateEmailDomain(email) {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain || disposableDomains.has(domain)) return false;
  try {
    const records = await dns.resolveMx(domain);
    return records.some(r => Number.isFinite(r.priority));
  } catch {
    return false;
  }
}

app.post('/api/auth/register', authLimiter, sameOrigin, async (req, res) => {
  const parsed = credentials.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Email ou mot de passe invalide. Le mot de passe doit contenir au moins 10 caractères.' });
  const { email, password } = parsed.data;
  const [localPart, domain] = email.split('@');
  const suggestedDomain = emailDomainSuggestion(domain);
  if (suggestedDomain) {
    const suggestion = `${localPart}@${suggestedDomain}`;
    return res.status(400).json({ suggestion, error: `Vérifie le domaine de ton adresse : voulais-tu écrire ${suggestion} ?` });
  }
  if (!(await validateEmailDomain(email))) return res.status(400).json({ error: 'Cette adresse email semble invalide ou son domaine ne reçoit pas de messages.' });
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) return res.status(409).json({ error: 'Un compte existe déjà avec cet email.' });
  const userId = id();
  const hash = await bcrypt.hash(password, 12);
  db.prepare('INSERT INTO users(id,email,password_hash,created_at,updated_at) VALUES(?,?,?,?,?)').run(userId, email, hash, now(), now());
  setSession(res, userId);
  res.status(201).json({ user: { email, plan: 'free' } });
});

app.post('/api/auth/login', authLimiter, sameOrigin, async (req, res) => {
  const parsed = credentials.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Identifiants invalides.' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(parsed.data.email);
  if (!user || !(await bcrypt.compare(parsed.data.password, user.password_hash))) return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
  setSession(res, user.id); res.json({ user: { email: user.email, plan: user.plan } });
});
app.post('/api/auth/logout', sameOrigin, (req, res) => { clearSession(res); res.status(204).end(); });
app.get('/api/me', auth, (req, res) => {
  const count = db.prepare('SELECT COUNT(*) AS count FROM analyses WHERE user_id=?').get(req.user.id).count;
  const latest = db.prepare('SELECT profile, created_at FROM analyses WHERE user_id=? ORDER BY created_at DESC LIMIT 1').get(req.user.id);
  res.json({ user: req.user, analysisCount: count, latestAnalysis: latest || null });
});

app.post('/api/analysis', auth, sameOrigin, (req, res) => {
  if (req.user.plan !== 'premium' && db.prepare('SELECT COUNT(*) c FROM analyses WHERE user_id=?').get(req.user.id).c >= 1) return res.status(402).json({ error: 'Ton analyse gratuite a déjà été utilisée.', upgrade: true });
  const schema = z.object({ profile: z.string().min(2).max(80), palette: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)).min(4).max(20), preferences: z.object({ style: z.string().max(60), occasion: z.string().max(60), budget: z.string().max(20) }) });
  const parsed = schema.safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: 'Données d’analyse invalides.' });
  db.prepare('INSERT INTO analyses(id,user_id,profile,palette_json,preferences_json,created_at) VALUES(?,?,?,?,?,?)').run(id(), req.user.id, parsed.data.profile, JSON.stringify(parsed.data.palette), JSON.stringify(parsed.data.preferences), now());
  res.status(201).json({ ok: true });
});

app.get('/api/analysis/latest', auth, (req, res) => {
  const row = db.prepare('SELECT profile, palette_json, preferences_json, created_at FROM analyses WHERE user_id=? ORDER BY created_at DESC LIMIT 1').get(req.user.id);
  if (!row) return res.json({ analysis: null });
  res.json({ analysis: { ...row, palette: JSON.parse(row.palette_json), preferences: JSON.parse(row.preferences_json) } });
});

app.post('/api/billing/checkout', auth, sameOrigin, async (req, res) => {
  if (!stripe || !process.env.STRIPE_PRICE_ID) return res.status(503).json({ error: 'Paiement non configuré. Ajoute les clés Stripe côté serveur.' });
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${ORIGIN}/?payment=success`,
      cancel_url: `${ORIGIN}/?payment=cancelled`,
      customer_email: req.user.email,
      client_reference_id: req.user.id,
      metadata: { userId: req.user.id },
      subscription_data: { metadata: { userId: req.user.id } },
      allow_promotion_codes: true,
      billing_address_collection: 'auto'
    });
    res.json({ url: session.url });
  } catch (e) { res.status(500).json({ error: 'Impossible de créer la session de paiement.' }); }
});

app.post('/api/billing/portal', auth, sameOrigin, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Paiement non configuré.' });
  const customer = db.prepare('SELECT stripe_customer_id FROM users WHERE id=?').get(req.user.id)?.stripe_customer_id;
  if (!customer) return res.status(404).json({ error: 'Aucun abonnement Stripe trouvé.' });
  const portal = await stripe.billingPortal.sessions.create({ customer, return_url: ORIGIN });
  res.json({ url: portal.url });
});

app.get('/health', (_req,res)=>res.json({ok:true}));
app.get('/health/ready', (_req,res)=>{
  let database = false;
  try { database = db.prepare('SELECT 1 AS ok').get().ok === 1; } catch { database = false; }
  const catalog = productCatalog.length > 0;
  const billing = Boolean(stripe && process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_PRICE_ID);
  const ready = database && catalog && billing;
  res.status(ready ? 200 : 503).json({ ok: ready, checks: { database, catalog, billing } });
});
app.use(express.static(path.join(root, 'public'), { extensions: ['html'], maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }));
app.get('/{*splat}', (_req,res)=>res.sendFile(path.join(root,'public','index.html')));
app.listen(PORT, ()=>console.log(`ColorFit running on ${ORIGIN}`));
