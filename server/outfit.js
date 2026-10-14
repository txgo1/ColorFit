'use strict';

const { SEASON_PROFILES, rgbToLab, deltaE } = require('./colorimetry');

const SUPPORTED_STYLES = [
  'Casual',
  'Streetwear',
  'Minimaliste',
  'Chic',
  'Old Money',
  'Techwear',
  'Y2K'
];

const SUPPORTED_OCCASIONS = [
  'Quotidien',
  'Université',
  'Travail',
  'Rendez-vous',
  'Soirée',
  'Vacances'
];

function hexToRgb(hex) {
  const clean = String(hex || '#888888').replace('#', '').trim();
  if (clean.length !== 6) return { r: 128, g: 128, b: 128 };
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) return { r: 128, g: 128, b: 128 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function hexToLab(hex) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToLab(r, g, b);
}

/**
 * 1. RÈGLES DE COHÉRENCE VESTIMENTAIRE (Séparées du générateur)
 */
const OutfitRulesEngine = {
  isColorRejected(colorHex, colorName, rejectedColors = []) {
    if (!Array.isArray(rejectedColors) || rejectedColors.length === 0) return false;
    const lowerName = String(colorName || '').toLowerCase();
    const lowerHex = String(colorHex || '').toLowerCase();
    return rejectedColors.some((rej) => {
      const token = String(rej || '').trim().toLowerCase();
      if (!token) return false;
      return lowerName.includes(token) || lowerHex === token;
    });
  },

  computePaletteHarmonyScore(itemHex, seasonProfile) {
    if (!seasonProfile) return 75;
    const itemLab = hexToLab(itemHex);
    const allRecommended = [...(seasonProfile.mainColors || []), ...(seasonProfile.secondaryColors || [])];
    let minDistance = Infinity;
    for (const c of allRecommended) {
      const d = deltaE(itemLab, hexToLab(c.hex));
      if (d < minDistance) minDistance = d;
    }
    return Math.max(20, Math.min(100, Math.round(100 - minDistance * 1.2)));
  },

  explainHarmony(topColor, bottomColor, seasonProfile) {
    const topLab = hexToLab(topColor.hex);
    const botLab = hexToLab(bottomColor.hex);
    const contrastL = Math.abs(topLab.L - botLab.L);
    return `Le haut en ${topColor.name} près du visage valorise votre sous-ton ${seasonProfile.undertone.toLowerCase()}, tandis que le bas en ${bottomColor.name} assure un contraste de clarté équilibré (${contrastL.toFixed(0)} points L* en CIELAB).`;
  }
};

/**
 * 2. GÉNÉRATEUR DE PROPOSITIONS D'OUTFITS (Archétypes vestimentaires & Dressing personnel)
 */
const STYLE_TEMPLATES = {
  Casual: {
    top: 'T-shirt structuré en coton peigné ou maille légère',
    bottom: 'Pantalon chino droit ou jean coupe droite',
    shoes: 'Sneakers minimalistes en cuir ou toile',
    jacket: 'Surchemise en twill de coton',
    accessory: 'Montre à bracelet cuir ou cabas en toile'
  },
  Streetwear: {
    top: 'Hoodie boxy à grammage lourd ou t-shirt oversize',
    bottom: 'Pantalon cargo ample ou jean baggy',
    shoes: 'Sneakers rétro multi-empiècements',
    jacket: 'Bomber oversize ou veste universitaire',
    accessory: 'Bonnet côtelé ou sacoche bandoulière'
  },
  Minimaliste: {
    top: 'Chemise fluide sans coutures apparentes ou col roulé fin',
    bottom: 'Pantalon tailleur à pinces coupe droite',
    shoes: 'Derbies épurées ou mocassins en cuir lisse',
    jacket: 'Manteau droit mi-long en laine mélangée',
    accessory: 'Ceinture fine à boucle brossée'
  },
  Chic: {
    top: 'Chemise en popeline ou blouse satinée',
    bottom: 'Pantalon habillé fuselé',
    shoes: 'Mocassins en cuir ou bottines Chelsea',
    jacket: 'Blazer ajusté structuré',
    accessory: 'Foulard en soie ou montre classique'
  },
  'Old Money': {
    top: 'Pull col V torsadé ou chemise Oxford rayée',
    bottom: 'Pantalon en flanelle ou chino beige à pinces',
    shoes: 'Mocassins penny loafers en cuir ou daim',
    jacket: 'Blazer croisé ou cardigan en maille fine',
    accessory: 'Lunettes écailles et ceinture en cuir tressé'
  },
  Techwear: {
    top: 'Haut technique respirant à col montant',
    bottom: 'Pantalon déperlant articulé à poches zippées',
    shoes: 'Baskets techniques à semelle crantée',
    jacket: 'Coupe-vent imperméable à membrane respirante',
    accessory: 'Sac tactique modulaire imperméable'
  },
  Y2K: {
    top: 'Baby tee ajusté ou haut zippé rétro',
    bottom: 'Jean taille basse évasé ou pantalon parachute',
    shoes: 'Sneakers chunky plateforme',
    jacket: 'Blouson court zippé style racing',
    accessory: 'Sac baguette et lunettes teintées sans monture'
  }
};

function generatePersonalizedOutfits(options = {}) {
  const seasonId = options.seasonId && SEASON_PROFILES[options.seasonId]
    ? options.seasonId
    : 'printemps_chaud';
  const seasonProfile = SEASON_PROFILES[seasonId];
  const style = SUPPORTED_STYLES.includes(options.style) ? options.style : 'Casual';
  const occasion = SUPPORTED_OCCASIONS.includes(options.occasion) ? options.occasion : 'Quotidien';
  const budget = Math.max(30, Number(options.budget) || 200);
  const rejectedColors = Array.isArray(options.rejectedColors) ? options.rejectedColors : [];
  const likedColors = Array.isArray(options.likedColors) ? options.likedColors : [];
  const variantOffset = Math.max(0, Number(options.variantIndex) || 0);

  // Filtrer les couleurs de la palette qui ne sont pas refusées par l'utilisateur
  let mainPool = seasonProfile.mainColors.filter(
    (c) => !OutfitRulesEngine.isColorRejected(c.hex, c.name, rejectedColors)
  );
  let neutralPool = seasonProfile.secondaryColors.filter(
    (c) => !OutfitRulesEngine.isColorRejected(c.hex, c.name, rejectedColors)
  );

  if (mainPool.length === 0) mainPool = seasonProfile.mainColors;
  if (neutralPool.length === 0) neutralPool = seasonProfile.secondaryColors;

  // Prioriser les couleurs aimées si elles figurent dans la palette
  if (likedColors.length > 0) {
    mainPool = [...mainPool].sort((a, b) => {
      const aLiked = likedColors.some((l) => a.name.toLowerCase().includes(String(l).toLowerCase()));
      const bLiked = likedColors.some((l) => b.name.toLowerCase().includes(String(l).toLowerCase()));
      return Number(bLiked) - Number(aLiked);
    });
  }

  const template = STYLE_TEMPLATES[style] || STYLE_TEMPLATES.Casual;
  const outfits = [];

  for (let i = 0; i < 3; i++) {
    const idx = i + variantOffset;
    const topColor = mainPool[idx % mainPool.length];
    const bottomColor = neutralPool[idx % neutralPool.length];
    const jacketColor = neutralPool[(idx + 1) % neutralPool.length];
    const shoeColor = neutralPool[(idx + 2) % neutralPool.length];
    const accentColor = mainPool[(idx + 2) % mainPool.length];

    // Répartition indicative du budget par pièce (aucun faux produit inventé)
    const topBudget = Math.round(budget * 0.22);
    const bottomBudget = Math.round(budget * 0.28);
    const shoesBudget = Math.round(budget * 0.26);
    const jacketBudget = Math.round(budget * 0.18);
    const accessoryBudget = Math.max(5, budget - (topBudget + bottomBudget + shoesBudget + jacketBudget));

    outfits.push({
      id: `outfit-${seasonId}-${style.toLowerCase().replace(/\s+/g, '-')}-${idx + 1}`,
      title: `Tenue ${style} — ${occasion} #${i + 1}`,
      style,
      occasion,
      totalTargetBudget: budget,
      seasonName: seasonProfile.name,
      items: [
        {
          slot: 'Haut',
          label: template.top,
          colorName: topColor.name,
          colorHex: topColor.hex,
          recommendedMaxPrice: topBudget
        },
        {
          slot: 'Bas',
          label: template.bottom,
          colorName: bottomColor.name,
          colorHex: bottomColor.hex,
          recommendedMaxPrice: bottomBudget
        },
        {
          slot: 'Chaussures',
          label: template.shoes,
          colorName: shoeColor.name,
          colorHex: shoeColor.hex,
          recommendedMaxPrice: shoesBudget
        },
        {
          slot: 'Veste',
          label: template.jacket,
          colorName: jacketColor.name,
          colorHex: jacketColor.hex,
          recommendedMaxPrice: jacketBudget
        },
        {
          slot: 'Accessoire (Facultatif)',
          label: template.accessory,
          colorName: accentColor.name,
          colorHex: accentColor.hex,
          recommendedMaxPrice: accessoryBudget
        }
      ],
      explanation: OutfitRulesEngine.explainHarmony(topColor, bottomColor, seasonProfile)
    });
  }

  return outfits;
}

/**
 * Génère des tenues exclusivement à partir des vêtements possédés dans le dressing de l'utilisateur.
 */
function generateWardrobeOutfits(wardrobeItems = [], seasonId = 'printemps_chaud', options = {}) {
  const seasonProfile = SEASON_PROFILES[seasonId] || SEASON_PROFILES.printemps_chaud;
  const tops = wardrobeItems.filter((item) => item.category === 'Haut');
  const bottoms = wardrobeItems.filter((item) => item.category === 'Bas');
  const shoes = wardrobeItems.filter((item) => item.category === 'Chaussures');
  const jackets = wardrobeItems.filter((item) => item.category === 'Veste');
  const accessories = wardrobeItems.filter((item) => item.category === 'Accessoire');

  if (tops.length === 0 || bottoms.length === 0) {
    return {
      ok: false,
      message: 'Votre dressing doit contenir au moins un Haut et un Bas pour composer une tenue complète à partir de vos vêtements.',
      outfits: []
    };
  }

  const combinations = [];
  for (const top of tops) {
    for (const bottom of bottoms) {
      const topScore = OutfitRulesEngine.computePaletteHarmonyScore(top.primary_color_hex, seasonProfile);
      const bottomScore = OutfitRulesEngine.computePaletteHarmonyScore(bottom.primary_color_hex, seasonProfile);
      const shoe = shoes[0] || null;
      const jacket = jackets[0] || null;
      const accessory = accessories[0] || null;

      const avgHarmony = Math.round(topScore * 0.65 + bottomScore * 0.35);
      combinations.push({
        title: `Tenue de mon dressing : ${top.name} & ${bottom.name}`,
        harmonyScore: avgHarmony,
        source: 'user_wardrobe_only',
        pieces: [
          top,
          bottom,
          ...(shoe ? [shoe] : []),
          ...(jacket ? [jacket] : []),
          ...(accessory ? [accessory] : [])
        ],
        explanation: OutfitRulesEngine.explainHarmony(
          { hex: top.primary_color_hex, name: top.primary_color_name },
          { hex: bottom.primary_color_hex, name: bottom.primary_color_name },
          seasonProfile
        )
      });
    }
  }

  combinations.sort((a, b) => b.harmonyScore - a.harmonyScore);
  return {
    ok: true,
    outfits: combinations.slice(0, 6)
  };
}

module.exports = {
  SUPPORTED_STYLES,
  SUPPORTED_OCCASIONS,
  OutfitRulesEngine,
  generatePersonalizedOutfits,
  generateWardrobeOutfits
};
