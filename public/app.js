'use strict';

(function () {
  const state = {
    user: null,
    csrfToken: null,
    authMode: 'login',
    currentImageGrid: null,
    variantIndex: 0,
    wardrobeItems: []
  };

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function showToast(message, isError = false) {
    const toast = document.getElementById('global-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('hidden');
    toast.style.background = isError ? '#fee2e2' : '#dcfce7';
    toast.style.color = isError ? '#991b1b' : '#166534';
    setTimeout(() => toast.classList.add('hidden'), 6000);
  }

  async function apiFetch(url, options = {}) {
    const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    if (state.csrfToken && ['POST', 'PUT', 'DELETE'].includes(options.method)) {
      headers['X-CSRF-Token'] = state.csrfToken;
    }
    const res = await fetch(url, Object.assign({}, options, { headers, credentials: 'same-origin' }));
    const data = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, data };
  }

  // =========================================================================
  // 1. GESTION SESSION ET ESPACE « MON COMPTE »
  // =========================================================================
  function syncHeaderButtons() {
    const authBtn = document.getElementById('open-auth-btn');
    const accountBtn = document.getElementById('open-account-btn');
    const guestNotice = document.getElementById('wardrobe-guest-notice');
    const authArea = document.getElementById('wardrobe-authenticated-area');

    if (state.user) {
      authBtn.classList.add('hidden');
      accountBtn.classList.remove('hidden');
      accountBtn.textContent = `Mon compte (${state.user.email})`;
      guestNotice.classList.add('hidden');
      authArea.classList.remove('hidden');
    } else {
      authBtn.classList.remove('hidden');
      accountBtn.classList.add('hidden');
      guestNotice.classList.remove('hidden');
      authArea.classList.add('hidden');
    }
  }

  async function refreshSessionOnLoad() {
    const { ok, data } = await apiFetch('/api/account/me', { method: 'GET' });
    if (ok && data.account) {
      state.user = data.account;
      state.csrfToken = data.csrfToken;
      syncHeaderButtons();
      loadWardrobe();
    } else {
      state.user = null;
      state.csrfToken = null;
      syncHeaderButtons();
    }
  }

  // Le bouton « Mon compte » ouvre UNIQUEMENT la modale compte et charge les données à jour
  async function openAccountModal() {
    const { ok, data } = await apiFetch('/api/account/me', { method: 'GET' });
    if (!ok || !data.account) {
      showToast('Votre session a expiré. Veuillez vous reconnecter.', true);
      state.user = null;
      syncHeaderButtons();
      return;
    }

    state.user = data.account;
    state.csrfToken = data.csrfToken;
    const acc = data.account;
    const container = document.getElementById('account-details-content');

    const latestHtml = acc.latestAnalysis
      ? `<strong>${escapeHtml(acc.latestAnalysis.seasonName)}</strong> (Indice de cohérence : ${Number(acc.latestAnalysis.confidenceScore)}/100)`
      : 'Aucune analyse enregistrée pour le moment';

    container.innerHTML = `
      <div class="item-card">
        <p><strong>Adresse email :</strong> ${escapeHtml(acc.email)}</p>
        <p><strong>Statut de l'adresse :</strong> ${acc.emailVerified ? '✅ Vérifiée' : '⚠️ En attente de confirmation par lien'}</p>
        <p><strong>Formule actuelle :</strong> ${acc.plan === 'premium' ? '🌟 Premium Actif' : 'Offre Gratuite'} ( Crédits analyse unique : ${Number(acc.singleAnalysisCredits)} )</p>
        <p><strong>Nombre d'analyses réalisées :</strong> ${Number(acc.analysisCount)}</p>
        <p><strong>Vêtements dans le dressing :</strong> ${Number(acc.wardrobeCount)}</p>
        <p><strong>Dernier profil colorimétrique :</strong> ${latestHtml}</p>
        <p><strong>Préférences enregistrées :</strong> Style ${escapeHtml(acc.preferences.style || 'Casual')} / Budget ${Number(acc.preferences.budget || 180)} €</p>
        <label style="display:flex;align-items:center;gap:0.5rem;margin-top:0.5rem;">
          <input type="checkbox" id="privacy-save-history" ${acc.privacySettings.saveHistory !== false ? 'checked' : ''} />
          Conserver l'historique de mes analyses colorimétriques
        </label>
      </div>
    `;

    const checkbox = document.getElementById('privacy-save-history');
    if (checkbox) {
      checkbox.addEventListener('change', async (e) => {
        await apiFetch('/api/account/privacy', {
          method: 'PUT',
          body: JSON.stringify({ saveHistory: e.target.checked })
        });
        showToast('Préférences de confidentialité mises à jour.');
      });
    }

    document.getElementById('account-modal').classList.remove('hidden');
  }

  // =========================================================================
  // 2. ANALYSE D'IMAGE CÔTÉ NAVIGATEUR ET APPEL API CIELAB
  // =========================================================================
  function buildSampleCalibratedGrid() {
    const width = 48;
    const height = 48;
    const pixels = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const nx = x / width;
        const ny = y / height;
        const jitter = ((x * 7 + y * 13) % 11) - 5;
        if (nx >= 0.28 && nx <= 0.72 && ny >= 0.22 && ny <= 0.65) {
          if (nx >= 0.35 && nx <= 0.65 && ny >= 0.34 && ny <= 0.41) {
            pixels.push({ r: 65 + jitter, g: 85 + jitter, b: 55 + jitter }); // Yeux noisette/vert
          } else {
            pixels.push({ r: 222 + jitter, g: 176 + jitter, b: 145 + jitter }); // Peau chaude dorée
          }
        } else if (nx >= 0.22 && nx <= 0.78 && ny >= 0.07 && ny <= 0.24) {
          pixels.push({ r: 95 + jitter, g: 62 + jitter, b: 40 + jitter }); // Cheveux châtain doré
        } else if (ny >= 0.73) {
          pixels.push({ r: 30, g: 60, b: 140 }); // Vêtement bleu (sera isolé et ignoré)
        } else {
          pixels.push({ r: 215 + jitter, g: 215 + jitter, b: 212 + jitter }); // Fond neutre
        }
      }
    }
    return { width, height, originalWidth: 640, originalHeight: 640, pixels };
  }

  function renderAnalysisResult(res) {
    const panel = document.getElementById('analysis-result');
    panel.classList.remove('hidden');

    if (!res.ok) {
      panel.innerHTML = `<div class="error-box"><strong>Photo inexploitable :</strong> ${escapeHtml(res.message)}</div>`;
      return;
    }

    const mainSwatches = (res.profile.mainColors || []).map((c) => `
      <span class="swatch-chip">
        <span class="swatch-circle" style="background:${escapeHtml(c.hex)}"></span>
        ${escapeHtml(c.name)} <small>(${escapeHtml(c.hex)})</small>
      </span>
    `).join('');

    const secSwatches = (res.profile.secondaryColors || []).map((c) => `
      <span class="swatch-chip">
        <span class="swatch-circle" style="background:${escapeHtml(c.hex)}"></span>
        ${escapeHtml(c.name)}
      </span>
    `).join('');

    const avoidSwatches = (res.profile.avoidColors || []).map((c) => `
      <span class="swatch-chip">
        <span class="swatch-circle" style="background:${escapeHtml(c.hex)}"></span>
        ${escapeHtml(c.name)}
      </span>
    `).join('');

    const secondaryBanner = res.secondarySeason
      ? `<div class="notice-banner"><strong>Profil alternatif proche :</strong> ${escapeHtml(res.secondarySeason.name)} — ${escapeHtml(res.secondarySeason.description)}</div>`
      : '';

    panel.innerHTML = `
      <hr style="margin:1.5rem 0;" />
      <h3>Profil estimé : ${escapeHtml(res.seasonName)}</h3>
      <p>${escapeHtml(res.profile.description)}</p>
      ${secondaryBanner}

      <div style="margin-top:1rem;">
        <p><strong>Sous-ton mesuré :</strong> ${escapeHtml(res.metrics.undertoneLabel)} (Indice thermique : ${Number(res.metrics.warmthIndex)}, ITA° : ${Number(res.metrics.itaAngle)}°, Contraste : ${escapeHtml(res.metrics.contrastLabel)})</p>
        <p><strong>Indice de fiabilité méthodologique :</strong> ${Number(res.confidence.score)}/100 — ${escapeHtml(res.confidence.label)}</p>
        <small class="subtitle">${escapeHtml(res.confidence.methodologyNote)}</small>
      </div>

      <h4 style="margin-top:1.25rem;">Couleurs principales recommandées</h4>
      <div class="swatches-row">${mainSwatches}</div>

      <h4>Couleurs neutres & secondaires</h4>
      <div class="swatches-row">${secSwatches}</div>

      <h4>Couleurs à utiliser avec précaution près du visage</h4>
      <div class="swatches-row">${avoidSwatches}</div>

      <p class="subtitle"><strong>Limites :</strong> ${escapeHtml(res.limitations)}</p>
    `;

    // Synchroniser automatiquement le sélecteur de saison des outfits
    const seasonSelect = document.getElementById('outfit-season');
    if (seasonSelect) {
      seasonSelect.value = res.seasonId;
      loadOutfits();
    }
  }

  // =========================================================================
  // 3. OUTFITS, DRESSING VIRTUEL & SHOPPING
  // =========================================================================
  async function loadOutfits() {
    const seasonId = document.getElementById('outfit-season').value;
    const style = document.getElementById('outfit-style').value;
    const occasion = document.getElementById('outfit-occasion').value;
    const budget = Number(document.getElementById('outfit-budget').value) || 180;
    const likedColors = document.getElementById('outfit-liked').value.split(',').map((s) => s.trim()).filter(Boolean);
    const rejectedColors = document.getElementById('outfit-rejected').value.split(',').map((s) => s.trim()).filter(Boolean);

    const { ok, data } = await apiFetch('/api/outfits/generate', {
      method: 'POST',
      body: JSON.stringify({
        seasonId,
        style,
        occasion,
        budget,
        likedColors,
        rejectedColors,
        variantIndex: state.variantIndex
      })
    });

    const container = document.getElementById('outfits-container');
    if (!ok || !data.outfits) return;

    container.innerHTML = data.outfits.map((o) => `
      <article class="item-card">
        <div>
          <h3>${escapeHtml(o.title)}</h3>
          <p class="subtitle">Palette ${escapeHtml(o.seasonName)} • Budget cible : ${Number(o.totalTargetBudget)} €</p>
          <ul style="list-style:none;margin-top:0.75rem;">
            ${o.items.map((piece) => `
              <li style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.45rem;">
                <span class="swatch-circle" style="background:${escapeHtml(piece.colorHex)}"></span>
                <span><strong>${escapeHtml(piece.slot)} :</strong> ${escapeHtml(piece.label)} (${escapeHtml(piece.colorName)}, ~${Number(piece.recommendedMaxPrice)} €)</span>
              </li>
            `).join('')}
          </ul>
        </div>
        <p style="font-size:0.88rem;color:var(--muted);">${escapeHtml(o.explanation)}</p>
      </article>
    `).join('');
  }

  async function loadWardrobe() {
    if (!state.user) return;
    const { ok, data } = await apiFetch('/api/wardrobe', { method: 'GET' });
    if (ok && Array.isArray(data.items)) {
      state.wardrobeItems = data.items;
      renderWardrobeList();
    }
  }

  function renderWardrobeList() {
    const search = (document.getElementById('wardrobe-search').value || '').toLowerCase();
    const cat = document.getElementById('wardrobe-filter-category').value;
    const container = document.getElementById('wardrobe-list');

    const filtered = state.wardrobeItems.filter((item) => {
      if (cat && item.category !== cat) return false;
      if (search && !item.name.toLowerCase().includes(search) && !(item.primary_color_name || '').toLowerCase().includes(search)) {
        return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      container.innerHTML = `<p class="subtitle">Aucun vêtement dans cette vue. Ajoutez vos articles ci-dessus.</p>`;
      return;
    }

    container.innerHTML = filtered.map((item) => `
      <article class="item-card">
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <strong>${escapeHtml(item.name)}</strong>
            <span class="swatch-circle" style="background:${escapeHtml(item.primary_color_hex)}"></span>
          </div>
          <p class="subtitle">${escapeHtml(item.category)} • ${escapeHtml(item.style)} • ${escapeHtml(item.primary_color_name)}</p>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-danger delete-wardrobe-btn" data-id="${Number(item.id)}">Supprimer</button>
        </div>
      </article>
    `).join('');

    container.querySelectorAll('.delete-wardrobe-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        await apiFetch(`/api/wardrobe/${id}`, { method: 'DELETE' });
        loadWardrobe();
      });
    });
  }

  async function loadShopProducts() {
    const cat = document.getElementById('shop-filter-category').value;
    const style = document.getElementById('shop-filter-style').value;
    const maxPrice = document.getElementById('shop-filter-budget').value;
    const params = new URLSearchParams();
    if (cat) params.set('category', cat);
    if (style) params.set('style', style);
    if (maxPrice) params.set('maxPrice', maxPrice);

    const { ok, data } = await apiFetch(`/api/products?${params.toString()}`, { method: 'GET' });
    const grid = document.getElementById('shop-products-grid');
    if (!ok || !Array.isArray(data.products)) return;

    grid.innerHTML = data.products.map((p) => `
      <article class="item-card">
        <div>
          <div style="display:flex;align-items:center;gap:0.5rem;">
            <span class="swatch-circle" style="background:${escapeHtml(p.colorHex)}"></span>
            <strong>${escapeHtml(p.brand)} — ${escapeHtml(p.name)}</strong>
          </div>
          <p class="price-tag" style="font-size:1.25rem;margin-top:0.4rem;">${Number(p.price).toFixed(2)} ${escapeHtml(p.currency)}</p>
          <p class="subtitle">${escapeHtml(p.category)} • ${escapeHtml(p.style)} • Couleur : ${escapeHtml(p.colorName)}</p>
          <p style="font-size:0.82rem;color:var(--muted);">Enseigne : ${escapeHtml(p.retailer)} • ${escapeHtml(p.availabilityNote)}</p>
          <p style="font-size:0.78rem;color:var(--muted);">Mis à jour le : ${escapeHtml(p.lastUpdatedAt.slice(0, 10))} ${p.isAffiliateLink ? '(Lien affilié)' : '(Lien direct sans commission)'}</p>
        </div>
        <a href="${escapeHtml(p.officialUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline">
          Voir sur la boutique officielle
        </a>
      </article>
    `).join('');
  }

  async function loadBillingStatus() {
    const { ok, data } = await apiFetch('/api/billing/status', { method: 'GET' });
    const banner = document.getElementById('stripe-status-banner');
    if (ok && banner) {
      banner.textContent = data.stripeConfigured
        ? 'Paiements sécurisés par Stripe Checkout (vérification serveur).'
        : 'Note de transparence : les clés Stripe ne sont pas encore configurées sur ce serveur de démonstration. Les tarifs ci-dessous sont des hypothèses commerciales.';
    }
  }

  // =========================================================================
  // INITIALISATION DES ÉVÉNEMENTS DOM
  // =========================================================================
  document.addEventListener('DOMContentLoaded', () => {
    refreshSessionOnLoad();
    loadOutfits();
    loadShopProducts();
    loadBillingStatus();

    // Sélection photo visage
    const photoInput = document.getElementById('face-photo-input');
    const runBtn = document.getElementById('run-analysis-btn');
    photoInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const previewWrap = document.getElementById('photo-preview-wrap');
          const previewImg = document.getElementById('face-preview-img');
          previewImg.src = ev.target.result;
          previewWrap.classList.remove('hidden');

          const canvas = document.getElementById('analysis-canvas');
          const ctx = canvas.getContext('2d');
          const w = 48;
          const h = 48;
          canvas.width = w;
          canvas.height = h;
          ctx.drawImage(img, 0, 0, w, h);
          const imgData = ctx.getImageData(0, 0, w, h).data;
          const pixels = [];
          for (let i = 0; i < imgData.length; i += 4) {
            pixels.push({ r: imgData[i], g: imgData[i + 1], b: imgData[i + 2] });
          }
          state.currentImageGrid = {
            width: w,
            height: h,
            originalWidth: img.naturalWidth,
            originalHeight: img.naturalHeight,
            pixels
          };
          runBtn.disabled = false;
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });

    runBtn.addEventListener('click', async () => {
      if (!state.currentImageGrid) return;
      runBtn.disabled = true;
      const { data } = await apiFetch('/api/colorimetry/analyze', {
        method: 'POST',
        body: JSON.stringify(state.currentImageGrid)
      });
      runBtn.disabled = false;
      renderAnalysisResult(data);
    });

    document.getElementById('demo-sample-btn').addEventListener('click', async () => {
      const sampleGrid = buildSampleCalibratedGrid();
      const { data } = await apiFetch('/api/colorimetry/analyze', {
        method: 'POST',
        body: JSON.stringify(sampleGrid)
      });
      renderAnalysisResult(data);
    });

    // Outfits
    document.getElementById('outfit-form').addEventListener('submit', (e) => {
      e.preventDefault();
      state.variantIndex = 0;
      loadOutfits();
    });

    document.getElementById('outfit-variant-btn').addEventListener('click', () => {
      state.variantIndex += 1;
      loadOutfits();
    });

    // Boutique
    document.getElementById('shop-filter-btn').addEventListener('click', loadShopProducts);

    // Modale Auth
    document.getElementById('open-auth-btn').addEventListener('click', () => {
      document.getElementById('auth-modal').classList.remove('hidden');
    });
    document.getElementById('close-auth-modal').addEventListener('click', () => {
      document.getElementById('auth-modal').classList.add('hidden');
    });

    document.getElementById('tab-login').addEventListener('click', () => {
      state.authMode = 'login';
      document.getElementById('tab-login').classList.add('active');
      document.getElementById('tab-register').classList.remove('active');
      document.getElementById('auth-submit-btn').textContent = 'Se connecter';
    });

    document.getElementById('tab-register').addEventListener('click', () => {
      state.authMode = 'register';
      document.getElementById('tab-register').classList.add('active');
      document.getElementById('tab-login').classList.remove('active');
      document.getElementById('auth-submit-btn').textContent = 'Créer mon compte';
    });

    document.getElementById('auth-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('auth-email').value.trim();
      const password = document.getElementById('auth-password').value;
      const errBox = document.getElementById('auth-error-box');
      errBox.classList.add('hidden');

      const endpoint = state.authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const { ok, data } = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      if (!ok) {
        errBox.textContent = data.error || 'Erreur d\'authentification.';
        errBox.classList.remove('hidden');
        return;
      }

      state.user = data.user;
      state.csrfToken = data.csrfToken;
      document.getElementById('auth-modal').classList.add('hidden');
      await refreshSessionOnLoad();
      showToast(data.message || 'Bienvenue sur ColorFit !');
    });

    // Bouton « Mon compte » : ouvre l'espace personnel sans jamais déconnecter
    document.getElementById('open-account-btn').addEventListener('click', openAccountModal);
    document.getElementById('close-account-modal').addEventListener('click', () => {
      document.getElementById('account-modal').classList.add('hidden');
    });

    // Déconnexion explicite uniquement sur clic du bouton dédié
    document.getElementById('explicit-logout-btn').addEventListener('click', async () => {
      await apiFetch('/api/auth/logout', { method: 'POST' });
      state.user = null;
      state.csrfToken = null;
      document.getElementById('account-modal').classList.add('hidden');
      syncHeaderButtons();
      showToast('Vous êtes maintenant déconnecté.');
    });

    // Suppression de compte
    document.getElementById('delete-account-btn').addEventListener('click', async () => {
      if (!window.confirm('Confirmez-vous la suppression définitive de votre compte et de toutes vos données ?')) return;
      const { ok, data } = await apiFetch('/api/account', { method: 'DELETE' });
      if (ok) {
        state.user = null;
        state.csrfToken = null;
        document.getElementById('account-modal').classList.add('hidden');
        syncHeaderButtons();
        showToast(data.message);
      }
    });

    // Ajout vêtement au dressing
    document.getElementById('wardrobe-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        name: document.getElementById('wardrobe-name').value,
        category: document.getElementById('wardrobe-category').value,
        primaryColorHex: document.getElementById('wardrobe-color-hex').value,
        primaryColorName: document.getElementById('wardrobe-color-name').value,
        style: document.getElementById('wardrobe-style').value
      };
      const { ok, data } = await apiFetch('/api/wardrobe', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (ok) {
        document.getElementById('wardrobe-name').value = '';
        loadWardrobe();
        showToast('Vêtement ajouté à votre dressing.');
      } else {
        showToast(data.error || 'Erreur lors de l\'ajout.', true);
      }
    });

    document.getElementById('wardrobe-search').addEventListener('input', renderWardrobeList);
    document.getElementById('wardrobe-filter-category').addEventListener('change', renderWardrobeList);

    document.getElementById('generate-wardrobe-outfits-btn').addEventListener('click', async () => {
      const seasonId = document.getElementById('outfit-season').value;
      const { data } = await apiFetch('/api/wardrobe/outfits', {
        method: 'POST',
        body: JSON.stringify({ seasonId })
      });
      const out = document.getElementById('wardrobe-outfits-result');
      if (!data.ok) {
        showToast(data.message, true);
        return;
      }
      out.innerHTML = data.outfits.map((o) => `
        <article class="item-card">
          <h4>${escapeHtml(o.title)} (Harmonie : ${Number(o.harmonyScore)}/100)</h4>
          <p class="subtitle">${escapeHtml(o.explanation)}</p>
        </article>
      `).join('');
    });

    // Paiements Stripe
    document.querySelectorAll('.subscribe-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!state.user) {
          document.getElementById('auth-modal').classList.remove('hidden');
          return;
        }
        const offerType = btn.getAttribute('data-offer');
        const { ok, data } = await apiFetch('/api/billing/checkout', {
          method: 'POST',
          body: JSON.stringify({ offerType })
        });
        if (ok && data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        } else {
          showToast(data.error || 'Configuration Stripe requise.', true);
        }
      });
    });
  });
})();
