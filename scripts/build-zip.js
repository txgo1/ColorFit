'use strict';

const { execSync } = require('child_process');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const outputZip = path.join(rootDir, 'colorfit-production-ready.zip');

try {
  execSync(
    `zip -r "${outputZip}" package.json .env.example .gitignore README.md PRODUCTION.md server/ public/ scripts/ data/products.json tests/`,
    { cwd: rootDir, stdio: 'inherit' }
  );
  console.log(`\nArchive ZIP prête : ${outputZip}`);
} catch (err) {
  console.error('Erreur lors de la création du ZIP (assurez-vous que l\'utilitaire zip est installé) :', err.message);
}
