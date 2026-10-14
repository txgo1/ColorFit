import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = 'https://raw.githubusercontent.com/arturayupov/womens-fashion-catalog-open-data/main/data/products.json';
const clothing = /dress|top|blouse|shirt|sweater|cardigan|jacket|coat|pants|jeans|shorts|skirt|legging|hoodie|sweatshirt|romper|jumpsuit|activewear|suit|vest/i;

const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
if (!response.ok) throw new Error(`Téléchargement du catalogue impossible (${response.status}).`);
const source = await response.json();
const products = source
  .filter(product => clothing.test(product.product_type || '') && product.featured_image_url && product.variants?.some(variant => variant.in_stock))
  .map(product => ({
    id: product.id,
    title: product.title,
    type: product.product_type,
    url: product.url,
    image: product.featured_image_url,
    price: product.price,
    variants: product.variants.filter(variant => variant.in_stock).map(variant => ({
      price_usd: variant.price_usd,
      color: variant.options?.Color || '',
      size: variant.options?.Size || ''
    })),
    tags: (product.tags || []).slice(0, 24)
  }));

const dataDir = path.join(root, 'data');
fs.mkdirSync(dataDir, { recursive: true });
fs.writeFileSync(path.join(dataDir, 'products.json'), JSON.stringify(products));
fs.writeFileSync(path.join(dataDir, 'catalog-meta.json'), JSON.stringify({
  source: 'Livostyle Open Data',
  sourceUrl: 'https://github.com/arturayupov/womens-fashion-catalog-open-data',
  syncedAt: new Date().toISOString(),
  productCount: products.length
}, null, 2));
console.log(`Catalogue actualisé : ${products.length} vêtements.`);
