# ColorFit

ColorFit is a local-development web app for personal color and outfit recommendations.

## Run locally

Requirements: Node.js 24 LTS

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Color analysis

The browser analyzes the uploaded images locally. The face image is used primarily for skin-tone/temperature/depth/chroma estimation; the full-body image contributes contrast information. The engine uses multiple dimensions and 12 seasonal profiles instead of returning a fixed palette.

This is an experimental color-analysis engine, not a medical or biometric identification system and not a substitute for a professional color consultation. For production, calibrate the model with a validated dataset and controlled lighting guidance.

## Product recommendations

ColorFit includes a compact snapshot of 1,114 in-stock clothing items from the [Livostyle Women's Fashion Catalog](https://github.com/arturayupov/womens-fashion-catalog-open-data), licensed under MIT. The app matches available color and price variants to the user's palette and displays product photos alongside the generated outfit illustrations. Product images stay on the retailer's CDN and product cards link to the original listing.

This is a women-focused US retailer catalog; prices are displayed in USD and availability can change after the snapshot was imported. It is a first catalog source, not a complete or regionally localized shopping feed. Refresh the snapshot with `npm run catalog:sync` and restart the server. See `data/PRODUCT_CATALOG_LICENSE.md` for the license and attribution.

## Production preparation

See [PRODUCTION.md](PRODUCTION.md) for the Docker deployment setup, required production environment variables, persistent database storage, Stripe preproduction settings and remaining France / EU launch requirements.
