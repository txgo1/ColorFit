'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const CATALOG_PATH = path.join(__dirname, '..', 'data', 'products.json');

function checkUrlReachable(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD', timeout: 5000 }, (res) => {
      resolve({ statusCode: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 400 });
    });
    req.on('error', () => resolve({ statusCode: 0, ok: false }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ statusCode: 0, ok: false });
    });
    req.end();
  });
}

async function auditCatalogLinks() {
  if (!fs.existsSync(CATALOG_PATH)) {
    console.error('Catalogue introuvable :', CATALOG_PATH);
    process.exit(1);
  }
  const products = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  console.log(`[Catalog Audit] Vérification de ${products.length} produits...`);
  for (const product of products) {
    const res = await checkUrlReachable(product.officialUrl);
    product.linkReachable = res.ok;
    product.lastCheckedAt = new Date().toISOString();
    console.log(` - ${product.id}: ${res.ok ? 'OK' : 'LIEN À VÉRIFIER'} (${res.statusCode})`);
  }
  fs.writeFileSync(CATALOG_PATH, JSON.stringify(products, null, 2), 'utf8');
}

if (require.main === module) {
  auditCatalogLinks();
}
