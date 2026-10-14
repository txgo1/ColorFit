'use strict';

const dns = require('dns').promises;

// Dictionnaire maintenable des fautes de frappe fréquentes sur les domaines majeurs
const COMMON_DOMAIN_TYPOS = {
  'gmai.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gmail.fr': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gnail.com': 'gmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmail.con': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outllok.com': 'outlook.com',
  'outlook.con': 'outlook.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yaho.fr': 'yahoo.fr',
  'wanado.fr': 'wanadoo.fr',
  'oragne.fr': 'orange.fr',
  'ornage.fr': 'orange.fr',
  'icloud.con': 'icloud.com',
  'icoud.com': 'icloud.com',
  'sfr.fe': 'sfr.fr',
  'free.fe': 'free.fr'
};

// Liste maintenable de domaines d'emails jetables refusés
const DISPOSABLE_DOMAINS = new Set([
  'yopmail.com',
  'yopmail.fr',
  '10minutemail.com',
  'tempmail.com',
  'temp-mail.org',
  'guerrillamail.com',
  'mailinator.com',
  'trashmail.com',
  'sharklasers.com',
  'getnada.com',
  'maildrop.cc',
  'dispostable.com',
  'fakeinbox.com',
  'throwawaymail.com'
]);

const EMAIL_SYNTAX_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Normalise prudemment une adresse email sans altérer arbitrairement la partie locale.
 */
function normalizeEmail(rawEmail) {
  if (typeof rawEmail !== 'string') return '';
  const trimmed = rawEmail.trim();
  const atIndex = trimmed.lastIndexOf('@');
  if (atIndex <= 0 || atIndex === trimmed.length - 1) {
    return trimmed.toLowerCase();
  }
  const localPart = trimmed.slice(0, atIndex).trim();
  const domainPart = trimmed.slice(atIndex + 1).trim().toLowerCase();
  return `${localPart.toLowerCase()}@${domainPart}`;
}

/**
 * Valide une adresse email (syntaxe, fautes de frappe connues, domaines jetables, et MX optionnel).
 * Note : la vérification DNS MX confirme uniquement que le domaine accepte des emails,
 * jamais que la boîte appartient à l'utilisateur (d'où le lien de confirmation obligatoire).
 */
async function validateEmailAddress(rawEmail, options = {}) {
  const normalized = normalizeEmail(rawEmail);

  if (!normalized || normalized.length > 254) {
    return { valid: false, reason: 'Veuillez saisir une adresse email valide.' };
  }

  if (!EMAIL_SYNTAX_REGEX.test(normalized)) {
    return { valid: false, reason: 'Le format de l\'adresse email est invalide.' };
  }

  const [localPart, domain] = normalized.split('@');
  if (!localPart || localPart.length > 64 || localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
    return { valid: false, reason: 'La partie locale de l\'adresse email est invalide.' };
  }

  const domainParts = domain.split('.');
  const tld = domainParts[domainParts.length - 1];
  if (domainParts.length < 2 || tld.length < 2 || /^\d+$/.test(tld)) {
    return { valid: false, reason: 'Le domaine de l\'adresse email est invalide.' };
  }

  if (COMMON_DOMAIN_TYPOS[domain]) {
    const suggested = `${localPart}@${COMMON_DOMAIN_TYPOS[domain]}`;
    return {
      valid: false,
      reason: `Le domaine « ${domain} » semble contenir une faute de frappe. Vouliez-vous écrire « ${suggested} » ?`,
      suggestion: suggested
    };
  }

  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      valid: false,
      reason: 'Les adresses email temporaires ou jetables ne sont pas acceptées.'
    };
  }

  const checkMx = options.checkMx ?? (process.env.ENABLE_DNS_MX_CHECK === 'true');
  if (checkMx) {
    try {
      const mxRecords = await dns.resolveMx(domain);
      if (!Array.isArray(mxRecords) || mxRecords.length === 0) {
        return {
          valid: false,
          reason: `Le domaine « ${domain} » ne dispose d'aucun serveur de réception d'emails (MX).`
        };
      }
    } catch (err) {
      if (err.code === 'ENOTFOUND' || err.code === 'ENODATA') {
        return {
          valid: false,
          reason: `Le domaine « ${domain} » est introuvable ou ne peut pas recevoir d'emails.`
        };
      }
      // En cas de panne DNS transitoire du serveur, on journalise sans bloquer abusivement
    }
  }

  return { valid: true, normalizedEmail: normalized };
}

module.exports = {
  normalizeEmail,
  validateEmailAddress,
  COMMON_DOMAIN_TYPOS,
  DISPOSABLE_DOMAINS
};
