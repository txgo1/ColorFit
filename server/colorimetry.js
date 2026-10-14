'use strict';

/**
 * Définition complète des 12 profils colorimétriques saisonniers.
 */
const SEASON_PROFILES = {
  printemps_clair: {
    id: 'printemps_clair',
    name: 'Printemps Clair',
    family: 'Printemps',
    undertone: 'Chaud-Neutre',
    depth: 'Clair',
    chroma: 'Doux à Lumineux',
    description: 'Votre harmonie naturelle est lumineuse, délicate et dorée. Les teintes pastel chaudes, fraîches et aériennes illuminent votre visage sans jamais le durcir.',
    mainColors: [
      { hex: '#F6C6AD', name: 'Pêche Rosé' },
      { hex: '#F9E076', name: 'Jaune Primevère' },
      { hex: '#88D4AB', name: 'Menthe d\'Eau' },
      { hex: '#7BC8F6', name: 'Bleu Ciel d\'Avril' },
      { hex: '#F4978E', name: 'Corail Clair' },
      { hex: '#E8D8C8', name: 'Amande Douce' }
    ],
    secondaryColors: [
      { hex: '#FAF0CA', name: 'Crème Vanille' },
      { hex: '#C9ADA7', name: 'Taupe Rosé' },
      { hex: '#5E6472', name: 'Ardoise Douce' },
      { hex: '#D4A373', name: 'Camel Clair' }
    ],
    avoidColors: [
      { hex: '#000000', name: 'Noir Absolu (trop dur)' },
      { hex: '#4A0E2E', name: 'Bordeaux Sombre' },
      { hex: '#1B263B', name: 'Marine Nocturne' }
    ],
    recommendedPairings: [
      'Haut Pêche Rosé + Bas Crème Vanille + Accessoires Camel Clair',
      'Chemise Bleu Ciel d\'Avril + Pantalon Amande Douce'
    ]
  },
  printemps_chaud: {
    id: 'printemps_chaud',
    name: 'Printemps Chaud',
    family: 'Printemps',
    undertone: 'Chaud',
    depth: 'Moyen-Clair',
    chroma: 'Lumineux',
    description: 'Vos caractéristiques rayonnent d\'une chaleur dorée franche. Les tons ensoleillés, corail, turquoise chaud et bronze léger mettent immédiatement votre teint en valeur.',
    mainColors: [
      { hex: '#FF7F50', name: 'Corail Vif' },
      { hex: '#F4A261', name: 'Abricot Doré' },
      { hex: '#E9C46A', name: 'Or Solaire' },
      { hex: '#52B788', name: 'Vert Prairie' },
      { hex: '#2EC4B6', name: 'Turquoise Chaud' },
      { hex: '#E76F51', name: 'Terracotta Clair' }
    ],
    secondaryColors: [
      { hex: '#FFF3E0', name: 'Ivoire Chaud' },
      { hex: '#BC6C25', name: 'Cognac' },
      { hex: '#606C38', name: 'Olive Doré' },
      { hex: '#8D5B4C', name: 'Brun Cannelle' }
    ],
    avoidColors: [
      { hex: '#C0C0C0', name: 'Gris Argenté Froid' },
      { hex: '#800080', name: 'Magenta Glacé' },
      { hex: '#0D1B2A', name: 'Noir Bleuté' }
    ],
    recommendedPairings: [
      'Haut Corail Vif + Bas Ivoire Chaud + Veste Cognac',
      'Pull Turquoise Chaud + Chino Camel'
    ]
  },
  printemps_vif: {
    id: 'printemps_vif',
    name: 'Printemps Vif',
    family: 'Printemps',
    undertone: 'Chaud-Neutre',
    depth: 'Moyen',
    chroma: 'Élevé (Vif)',
    description: 'Votre contraste net et votre éclat naturel supportent des couleurs saturées, franches et énergiques à sous-ton chaud.',
    mainColors: [
      { hex: '#FF595E', name: 'Coquelicot' },
      { hex: '#FFCA3A', name: 'Jaune Tournesol' },
      { hex: '#8AC926', name: 'Vert Citron Vert' },
      { hex: '#1982C4', name: 'Bleu Cobalt Chaud' },
      { hex: '#FF924C', name: 'Mandarine' },
      { hex: '#00B4D8', name: 'Cyan Tropical' }
    ],
    secondaryColors: [
      { hex: '#FFFDF7', name: 'Blanc Crème' },
      { hex: '#2B2D42', name: 'Marine Vif' },
      { hex: '#B5838D', name: 'Bois de Rose' },
      { hex: '#9C6644', name: 'Cuir Naturel' }
    ],
    avoidColors: [
      { hex: '#8D99AE', name: 'Gris Poussiéreux' },
      { hex: '#6B705C', name: 'Kaki Terne' },
      { hex: '#4A4E69', name: 'Mauve Grisé' }
    ],
    recommendedPairings: [
      'Haut Bleu Cobalt Chaud + Bas Blanc Crème + Veste Marine Vif',
      'T-shirt Coquelicot + Jean Brut + Sneakers Blanc Crème'
    ]
  },
  ete_clair: {
    id: 'ete_clair',
    name: 'Été Clair',
    family: 'Été',
    undertone: 'Froid-Neutre',
    depth: 'Clair',
    chroma: 'Doux',
    description: 'Votre palette allie fraîcheur rosée et clarté poudrée. Les tons pastel froids, bleu glacier, lavande et gris perle créent une élégance naturelle.',
    mainColors: [
      { hex: '#A8DADC', name: 'Bleu Glacier' },
      { hex: '#F1C0E8', name: 'Rose Poudré' },
      { hex: '#CFBAF0', name: 'Lavande Clair' },
      { hex: '#90E0EF', name: 'Aigue-Marine' },
      { hex: '#B8E0D2', name: 'Vert d\'Eau Froid' },
      { hex: '#E5989B', name: 'Framboise Pastel' }
    ],
    secondaryColors: [
      { hex: '#F8F9FA', name: 'Blanc Craie' },
      { hex: '#ADB5BD', name: 'Gris Perle' },
      { hex: '#457B9D', name: 'Bleu Acier' },
      { hex: '#6D6875', name: 'Gris Mauve' }
    ],
    avoidColors: [
      { hex: '#D97706', name: 'Orange Rouille' },
      { hex: '#000000', name: 'Noir Pur' },
      { hex: '#78350F', name: 'Marron Chaud' }
    ],
    recommendedPairings: [
      'Chemise Bleu Glacier + Pantalon Gris Perle + Chaussures Blanc Craie',
      'Pull Rose Poudré + Jean Bleu Acier'
    ]
  },
  ete_doux: {
    id: 'ete_doux',
    name: 'Été Doux',
    family: 'Été',
    undertone: 'Froid-Neutre',
    depth: 'Moyen',
    chroma: 'Très Doux (Muté)',
    description: 'Votre harmonie est veloutée, feutrée et subtilement froide. Les teintes sauge, bois de rose, bleu orage et taupe grisé subliment votre douceur naturelle.',
    mainColors: [
      { hex: '#84A59D', name: 'Vert Sauge' },
      { hex: '#B5838D', name: 'Vieux Rose' },
      { hex: '#778DA9', name: 'Bleu Orage' },
      { hex: '#9A8C98', name: 'Lilas Grisé' },
      { hex: '#52796F', name: 'Eucalyptus' },
      { hex: '#C9ADA7', name: 'Grège Rosé' }
    ],
    secondaryColors: [
      { hex: '#E0FBFC', name: 'Blanc Brume' },
      { hex: '#4A4E69', name: 'Prune Fumé' },
      { hex: '#6C757D', name: 'Gris Ardoise' },
      { hex: '#3D5A80', name: 'Denim Délavé' }
    ],
    avoidColors: [
      { hex: '#FF006E', name: 'Fuchsia Néon' },
      { hex: '#FB5607', name: 'Orange Électrique' },
      { hex: '#FFBE0B', name: 'Jaune Vif' }
    ],
    recommendedPairings: [
      'Surchemise Vert Sauge + T-shirt Blanc Brume + Pantalon Gris Ardoise',
      'Maille Vieux Rose + Jean Denim Délavé'
    ]
  },
  ete_froid: {
    id: 'ete_froid',
    name: 'Été Froid',
    family: 'Été',
    undertone: 'Froid',
    depth: 'Moyen',
    chroma: 'Modéré',
    description: 'Vos sous-tons froids s\'accordent avec les bleus marins, les roses baies, le vert émeraude adouci et les gris argentés.',
    mainColors: [
      { hex: '#1D3557', name: 'Bleu Océan' },
      { hex: '#E63946', name: 'Rouge Framboise' },
      { hex: '#457B9D', name: 'Bleu Azur Froid' },
      { hex: '#7209B7', name: 'Améthyste' },
      { hex: '#2A9D8F', name: 'Jade Froid' },
      { hex: '#D8839A', name: 'Rose Orchidée' }
    ],
    secondaryColors: [
      { hex: '#F1FAEE', name: 'Blanc Givré' },
      { hex: '#495057', name: 'Anthracite Froid' },
      { hex: '#8D99AE', name: 'Gris Bleuté' },
      { hex: '#2B2D42', name: 'Marine Froid' }
    ],
    avoidColors: [
      { hex: '#F4A261', name: 'Abricot Chaud' },
      { hex: '#E9C46A', name: 'Jaune Moutarde' },
      { hex: '#9C6644', name: 'Camel Orangé' }
    ],
    recommendedPairings: [
      'Haut Bleu Azur Froid + Pantalon Anthracite Froid + Veste Marine',
      'Pull Rouge Framboise + Bas Gris Bleuté'
    ]
  },
  automne_doux: {
    id: 'automne_doux',
    name: 'Automne Doux',
    family: 'Automne',
    undertone: 'Chaud-Neutre',
    depth: 'Moyen',
    chroma: 'Doux (Muté)',
    description: 'Votre palette est naturelle, organique et feutrée. Les tons olive, avoine, terracotta adouci et noisette s\'intègrent parfaitement à votre carnation.',
    mainColors: [
      { hex: '#A3B18A', name: 'Vert Olive Doux' },
      { hex: '#D4A373', name: 'Sable Doré' },
      { hex: '#E07A5F', name: 'Terre Cuite Douce' },
      { hex: '#81B29A', name: 'Céladon Chaud' },
      { hex: '#B08968', name: 'Noisette' },
      { hex: '#F2CC8F', name: 'Blé Mûr' }
    ],
    secondaryColors: [
      { hex: '#FEFAE0', name: 'Écru Lin' },
      { hex: '#588157', name: 'Kaki Forêt' },
      { hex: '#7F5539', name: 'Moka' },
      { hex: '#3D405B', name: 'Marine Grisé' }
    ],
    avoidColors: [
      { hex: '#FF007F', name: 'Rose Fluo' },
      { hex: '#000000', name: 'Noir Franc' },
      { hex: '#E0FFFF', name: 'Blanc Bleuté Glacial' }
    ],
    recommendedPairings: [
      'Chemise Écru Lin + Surchemise Vert Olive Doux + Chino Noisette',
      'Haut Terre Cuite Douce + Pantalon Sable Doré'
    ]
  },
  automne_chaud: {
    id: 'automne_chaud',
    name: 'Automne Chaud',
    family: 'Automne',
    undertone: 'Chaud',
    depth: 'Moyen à Profond',
    chroma: 'Riche',
    description: 'Vos couleurs sont riches, épicées et intensément chaudes : rouille, moutarde, vert mousse, bronze et chocolat.',
    mainColors: [
      { hex: '#BB3E03', name: 'Rouille Cuivré' },
      { hex: '#CA6702', name: 'Ocre Ambré' },
      { hex: '#EE9B00', name: 'Jaune Moutarde' },
      { hex: '#386641', name: 'Vert Mousse' },
      { hex: '#0A9396', name: 'Bleu Paon' },
      { hex: '#9B2226', name: 'Brique Épicée' }
    ],
    secondaryColors: [
      { hex: '#E9D8A6', name: 'Parchemin' },
      { hex: '#5F370E', name: 'Brun Tabac' },
      { hex: '#606C38', name: 'Bronze Kaki' },
      { hex: '#7F4F24', name: 'Caramel Brun' }
    ],
    avoidColors: [
      { hex: '#F8F9FA', name: 'Blanc Optique' },
      { hex: '#F1C0E8', name: 'Rose Pastel Froid' },
      { hex: '#A8DADC', name: 'Bleu Glacé' }
    ],
    recommendedPairings: [
      'Pull Rouille Cuivré + Pantalon Parchemin + Veste Brun Tabac',
      'Chemise Bleu Paon + Chino Caramel Brun'
    ]
  },
  automne_profond: {
    id: 'automne_profond',
    name: 'Automne Profond',
    family: 'Automne',
    undertone: 'Chaud-Neutre',
    depth: 'Profond',
    chroma: 'Riche à Intense',
    description: 'Vous possédez une profondeur et un contraste chaleureux remarquables. Les tons forêt sombre, bordeaux chaud, chocolat noir et bleu pétrole vous subliment.',
    mainColors: [
      { hex: '#1B4332', name: 'Vert Sapin' },
      { hex: '#6A040F', name: 'Grenat Chaud' },
      { hex: '#005F73', name: 'Bleu Pétrole' },
      { hex: '#9B2226', name: 'Rouge Carmin Chaud' },
      { hex: '#D97706', name: 'Ambre Doré' },
      { hex: '#3C096C', name: 'Aubergine Chaud' }
    ],
    secondaryColors: [
      { hex: '#F3E9DC', name: 'Crème Intense' },
      { hex: '#3D2622', name: 'Chocolat Noir' },
      { hex: '#283618', name: 'Olive Noir' },
      { hex: '#B08968', name: 'Camel Chaud' }
    ],
    avoidColors: [
      { hex: '#E2ECE9', name: 'Pastel Lavé' },
      { hex: '#CFCFCF', name: 'Gris Clair Froid' },
      { hex: '#FFC8DD', name: 'Rose Bonbon' }
    ],
    recommendedPairings: [
      'Manteau Chocolat Noir + Maille Crème Intense + Pantalon Vert Sapin',
      'Haut Bleu Pétrole + Chino Camel Chaud'
    ]
  },
  hiver_profond: {
    id: 'hiver_profond',
    name: 'Hiver Profond',
    family: 'Hiver',
    undertone: 'Froid-Neutre',
    depth: 'Très Profond',
    chroma: 'Élevé',
    description: 'Votre contraste intense appelle des teintes profondes et structurées : noir, bleu nuit, bordeaux glacé, vert émeraude sombre et blanc pur.',
    mainColors: [
      { hex: '#10002B', name: 'Violet Nuit' },
      { hex: '#03045E', name: 'Bleu Outremer Profond' },
      { hex: '#800F2F', name: 'Bordeaux Royal' },
      { hex: '#004B23', name: 'Émeraude Sombre' },
      { hex: '#C9184A', name: 'Rubis Froid' },
      { hex: '#1D3557', name: 'Bleu Prusse' }
    ],
    secondaryColors: [
      { hex: '#FFFFFF', name: 'Blanc Pur' },
      { hex: '#111111', name: 'Noir Carbone' },
      { hex: '#343A40', name: 'Anthracite Profond' },
      { hex: '#ADB5BD', name: 'Acier Froid' }
    ],
    avoidColors: [
      { hex: '#E9C46A', name: 'Jaune Sablé' },
      { hex: '#D4A373', name: 'Beige Doré' },
      { hex: '#F4A261', name: 'Orange Doux' }
    ],
    recommendedPairings: [
      'Veste Noir Carbone + Chemise Blanc Pur + Pantalon Anthracite Profond',
      'Pull Bordeaux Royal + Jean Brut Noir'
    ]
  },
  hiver_froid: {
    id: 'hiver_froid',
    name: 'Hiver Froid',
    family: 'Hiver',
    undertone: 'Froid',
    depth: 'Moyen à Profond',
    chroma: 'Franc',
    description: 'Votre carnation froide et contrastée est magnifiée par les tons bijoux glacés : bleu saphir, magenta froid, vert pin et gris argenté.',
    mainColors: [
      { hex: '#0077B6', name: 'Bleu Saphir' },
      { hex: '#B5179E', name: 'Magenta Royal' },
      { hex: '#D90429', name: 'Rouge Cerise Froid' },
      { hex: '#480CA8', name: 'Indigo Pourpre' },
      { hex: '#008B8B', name: 'Turquoise Arctique' },
      { hex: '#2B9348', name: 'Vert Émeraude Froid' }
    ],
    secondaryColors: [
      { hex: '#F8F9FA', name: 'Blanc Glacé' },
      { hex: '#161A1D', name: 'Noir Onyx' },
      { hex: '#495057', name: 'Gris Fusain' },
      { hex: '#14213D', name: 'Marine Glacé' }
    ],
    avoidColors: [
      { hex: '#CA6702', name: 'Orange Rouille' },
      { hex: '#E9C46A', name: 'Or Jaune' },
      { hex: '#BC6C25', name: 'Camel Cuivré' }
    ],
    recommendedPairings: [
      'Haut Bleu Saphir + Pantalon Gris Fusain + Manteau Marine Glacé',
      'Chemise Blanc Glacé + Costume Noir Onyx + Touche Rouge Cerise'
    ]
  },
  hiver_vif: {
    id: 'hiver_vif',
    name: 'Hiver Vif',
    family: 'Hiver',
    undertone: 'Froid-Neutre',
    depth: 'Moyen à Contrasté',
    chroma: 'Très Élevé (Éclatant)',
    description: 'Votre contraste exceptionnel supporte les couleurs les plus pures et saturées du spectre : bleu électrique, fuchsia, rouge pur et contrastes noir/blanc francs.',
    mainColors: [
      { hex: '#0050FF', name: 'Bleu Électrique' },
      { hex: '#FF006E', name: 'Fuchsia Pur' },
      { hex: '#EF233C', name: 'Rouge Vif' },
      { hex: '#06D6A0', name: 'Émeraude Éclatant' },
      { hex: '#8338EC', name: 'Violet Électrique' },
      { hex: '#00BBF9', name: 'Cyan Glacé' }
    ],
    secondaryColors: [
      { hex: '#FFFFFF', name: 'Blanc Optique' },
      { hex: '#0B090A', name: 'Noir Jais' },
      { hex: '#6C757D', name: 'Argent Métallique' },
      { hex: '#1D3557', name: 'Marine Intense' }
    ],
    avoidColors: [
      { hex: '#A3B18A', name: 'Vert Sauge Terne' },
      { hex: '#D4A373', name: 'Beige Poussiéreux' },
      { hex: '#B5838D', name: 'Mauve Délavé' }
    ],
    recommendedPairings: [
      'Haut Bleu Électrique + Pantalon Noir Jais + Sneakers Blanc Optique',
      'Blazer Noir Jais + Haut Fuchsia Pur'
    ]
  }
};

/**
 * Conversion sRGB [0..255] vers CIELAB (D65)
 */
function rgbToLab(r, g, b) {
  let sr = r / 255;
  let sg = g / 255;
  let sb = b / 255;

  sr = sr > 0.04045 ? Math.pow((sr + 0.055) / 1.055, 2.4) : sr / 12.92;
  sg = sg > 0.04045 ? Math.pow((sg + 0.055) / 1.055, 2.4) : sg / 12.92;
  sb = sb > 0.04045 ? Math.pow((sb + 0.055) / 1.055, 2.4) : sb / 12.92;

  const x = (sr * 0.4124564 + sg * 0.3575761 + sb * 0.1804375) / 0.95047;
  const y = (sr * 0.2126729 + sg * 0.7151522 + sb * 0.0721750) / 1.00000;
  const z = (sr * 0.0193339 + sg * 0.1191920 + sb * 0.9503041) / 1.08883;

  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : (7.787 * t) + (16 / 116));
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);

  const L = (116 * fy) - 16;
  const a = 500 * (fx - fy);
  const bStar = 200 * (fy - fz);

  return { L, a, b: bStar };
}

function deltaE(lab1, lab2) {
  return Math.sqrt(
    Math.pow(lab1.L - lab2.L, 2) +
    Math.pow(lab1.a - lab2.a, 2) +
    Math.pow(lab1.b - lab2.b, 2)
  );
}

/**
 * Détecte si un pixel correspond vraisemblablement à une carnation humaine (toutes phototypes confondus)
 * tout en excluant les fonds saturés et les vêtements.
 */
function isLikelySkinPixel(r, g, b, lab) {
  if (lab.L < 14 || lab.L > 94) return false;
  // En CIELAB, la peau humaine présente un a* > 1.5 et un b* > 2 avec une chrominance modérée
  const chroma = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  if (lab.a < 1.2 || lab.b < 1.5) return false;
  if (chroma < 4 || chroma > 58) return false;
  // Ratio rouge/bleu toujours positif sur la peau naturelle
  if (r <= b || r < 35) return false;
  return true;
}

/**
 * Analyse complète d'une grille d'échantillons d'image.
 * Accepte une grille de pixels `{ width, height, pixels: [{r,g,b}, ...] }`
 * extraite par le canvas du navigateur ou fournie par les tests.
 */
function analyzeImageGrid(gridInput) {
  if (!gridInput || typeof gridInput !== 'object') {
    return {
      ok: false,
      code: 'INVALID_PAYLOAD',
      message: 'Données d\'image absentes ou invalides.'
    };
  }

  const width = Number(gridInput.width) || 0;
  const height = Number(gridInput.height) || 0;
  const origWidth = Number(gridInput.originalWidth) || width;
  const origHeight = Number(gridInput.originalHeight) || height;
  const pixels = Array.isArray(gridInput.pixels) ? gridInput.pixels : [];

  if (origWidth < 160 || origHeight < 160 || width < 16 || height < 16 || pixels.length !== width * height) {
    return {
      ok: false,
      code: 'LOW_RESOLUTION',
      message: 'La résolution de la photo est insuffisante (minimum requis : 160×160 px). Veuillez fournir une photo plus nette.'
    };
  }

  // 1. Contrôle d'exposition et de flou (variance du Laplacien sur la luminance)
  let totalL = 0;
  let darkCount = 0;
  let brightCount = 0;
  const lumGrid = new Float32Array(width * height);

  for (let i = 0; i < pixels.length; i++) {
    const p = pixels[i];
    const r = Math.max(0, Math.min(255, Number(p.r) || 0));
    const g = Math.max(0, Math.min(255, Number(p.g) || 0));
    const b = Math.max(0, Math.min(255, Number(p.b) || 0));
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    lumGrid[i] = lum;
    totalL += lum;
    if (lum < 25) darkCount++;
    if (lum > 242) brightCount++;
  }

  const meanLum = totalL / pixels.length;
  const darkRatio = darkCount / pixels.length;
  const brightRatio = brightCount / pixels.length;

  if (meanLum < 32 || darkRatio > 0.65) {
    return {
      ok: false,
      code: 'TOO_DARK',
      message: 'La photo est trop sombre (sous-exposée). Placez-vous face à une fenêtre en lumière naturelle.'
    };
  }

  if (meanLum > 235 || brightRatio > 0.60) {
    return {
      ok: false,
      code: 'OVEREXPOSED',
      message: 'La photo est surexposée (zones brûlées trop importantes). Évitez le soleil direct ou le flash.'
    };
  }

  // Calcul de la variance du Laplacien pour détecter le flou
  let lapSum = 0;
  let lapSqSum = 0;
  let lapCount = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const lap = (
        -4 * lumGrid[idx] +
        lumGrid[idx - 1] +
        lumGrid[idx + 1] +
        lumGrid[idx - width] +
        lumGrid[idx + width]
      );
      lapSum += lap;
      lapSqSum += lap * lap;
      lapCount++;
    }
  }
  const lapMean = lapSum / Math.max(1, lapCount);
  const lapVariance = (lapSqSum / Math.max(1, lapCount)) - (lapMean * lapMean);

  if (lapVariance < 12 && gridInput.bypassBlurCheck !== true) {
    return {
      ok: false,
      code: 'TOO_BLURRY',
      message: 'L\'image est trop floue ou uniforme pour distinguer les régions du visage. Stabilisez l\'appareil et reprenez la photo.'
    };
  }

  // 2. Estimation de l'illuminant sur l'arrière-plan / périphérie pour correction douce (Von Kries amorti)
  let bgR = 0, bgG = 0, bgB = 0, bgCount = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = x / width;
      const ny = y / height;
      const isBorder = nx < 0.15 || nx > 0.85 || ny < 0.10;
      if (isBorder) {
        const p = pixels[y * width + x];
        bgR += p.r;
        bgG += p.g;
        bgB += p.b;
        bgCount++;
      }
    }
  }

  const avgBgR = bgCount > 0 ? bgR / bgCount : 128;
  const avgBgG = bgCount > 0 ? bgG / bgCount : 128;
  const avgBgB = bgCount > 0 ? bgB / bgCount : 128;
  const bgGray = (avgBgR + avgBgG + avgBgB) / 3;

  // Amortissement limité à 25 % pour compenser un léger éclairage ambiant sans jamais écraser le sous-ton ni laisser le fond dicter la peau
  const damping = 0.20;
  const scaleR = avgBgR > 20 ? 1 + damping * ((bgGray / avgBgR) - 1) : 1;
  const scaleG = avgBgG > 20 ? 1 + damping * ((bgGray / avgBgG) - 1) : 1;
  const scaleB = avgBgB > 20 ? 1 + damping * ((bgGray / avgBgB) - 1) : 1;

  // 3. Segmentation spatiale et colorimétrique des régions :
  // - Visage central (0.28 <= nx <= 0.72, 0.22 <= ny <= 0.65)
  // - Yeux (0.32 <= nx <= 0.68, 0.32 <= ny <= 0.44)
  // - Cheveux / Couronne (0.22 <= nx <= 0.78, 0.08 <= ny <= 0.26)
  // - Vêtements (0.20 <= nx <= 0.80, 0.72 <= ny <= 0.96) -> Exclus de l'analyse peau !
  const skinSamples = [];
  const hairSamples = [];
  const eyeSamples = [];
  const clothingSamples = [];
  let faceBoxTotal = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = x / width;
      const ny = y / height;
      const raw = pixels[y * width + x];

      const r = Math.max(0, Math.min(255, raw.r * Math.max(0.88, Math.min(1.12, scaleR))));
      const g = Math.max(0, Math.min(255, raw.g * Math.max(0.88, Math.min(1.12, scaleG))));
      const b = Math.max(0, Math.min(255, raw.b * Math.max(0.88, Math.min(1.12, scaleB))));
      const lab = rgbToLab(r, g, b);

      const inFaceRegion = nx >= 0.28 && nx <= 0.72 && ny >= 0.22 && ny <= 0.65;
      const inEyeBand = nx >= 0.33 && nx <= 0.67 && ny >= 0.33 && ny <= 0.43;
      const inHairRegion = nx >= 0.22 && nx <= 0.78 && ny >= 0.07 && ny <= 0.24;
      const inClothingRegion = nx >= 0.20 && nx <= 0.80 && ny >= 0.73 && ny <= 0.96;

      if (inFaceRegion) {
        faceBoxTotal++;
        if (inEyeBand && !isLikelySkinPixel(r, g, b, lab) && lab.L < 65) {
          eyeSamples.push(lab);
        } else if (isLikelySkinPixel(r, g, b, lab)) {
          skinSamples.push(lab);
        }
      } else if (inHairRegion && !isLikelySkinPixel(r, g, b, lab) && lab.L < 82) {
        hairSamples.push(lab);
      } else if (inClothingRegion) {
        clothingSamples.push(lab);
      }
    }
  }

  const faceSkinRatio = skinSamples.length / Math.max(1, faceBoxTotal);

  if (skinSamples.length < 18 || faceSkinRatio < 0.28) {
    return {
      ok: false,
      code: 'FACE_NOT_DETECTED_OR_OCCLUDED',
      message: 'Aucun visage suffisamment visible n\'a été détecté au centre de l\'image (visage absent, trop petit ou partiellement masqué). Cadrez votre visage de face.'
    };
  }

  // 4. Agrégation robuste par médiane/moyenne tronquée sur la peau (élimine reflets et ombres résiduelles)
  skinSamples.sort((p1, p2) => p1.L - p2.L);
  const trimStart = Math.floor(skinSamples.length * 0.15);
  const trimEnd = Math.ceil(skinSamples.length * 0.85);
  const coreSkin = skinSamples.slice(trimStart, trimEnd);

  const avgLab = (arr, fallback) => {
    if (!arr || arr.length === 0) return fallback;
    const sum = arr.reduce((acc, item) => ({ L: acc.L + item.L, a: acc.a + item.a, b: acc.b + item.b }), { L: 0, a: 0, b: 0 });
    return { L: sum.L / arr.length, a: sum.a / arr.length, b: sum.b / arr.length };
  };

  const skinLab = avgLab(coreSkin, { L: 65, a: 10, b: 16 });
  const hairLab = avgLab(hairSamples, { L: Math.max(20, skinLab.L - 25), a: 4, b: 8 });
  const eyeLab = avgLab(eyeSamples, { L: Math.max(25, skinLab.L - 20), a: 3, b: 6 });

  // Vérification d'une dominante colorée extrême sur la peau
  if (Math.abs(skinLab.a) > 42 || Math.abs(skinLab.b) > 52) {
    return {
      ok: false,
      code: 'SEVERE_COLOR_CAST',
      message: 'Une dominante colorée artificielle importante fausse les couleurs de la photo (éclairage néon ou filtre coloré). Utilisez une lumière du jour neutre.'
    };
  }

  // 5. Calcul des caractéristiques colorimétriques explicables en CIELAB
  // Indice de température (b* doré vs a* rosé, calibré autour du ratio naturel de l'hémoglobine/mélanine)
  const warmthIndex = (skinLab.b - 1.15 * skinLab.a) + (hairLab.b - hairLab.a) * 0.25;
  // Angle ITA° (Individual Typology Angle)
  const itaAngle = Math.atan2(skinLab.L - 50, Math.max(1, skinLab.b)) * (180 / Math.PI);
  // Chromaticité (saturation apparente)
  const skinChroma = Math.sqrt(skinLab.a * skinLab.a + skinLab.b * skinLab.b);
  // Contraste multi-régions (peau vs cheveux et yeux) — indépendant des vêtements
  const skinHairContrast = Math.abs(skinLab.L - hairLab.L);
  const skinEyeContrast = deltaE(skinLab, eyeLab);
  const overallContrast = (skinHairContrast * 0.65) + (skinEyeContrast * 0.35);
  // Profondeur globale (clarté combinée peau + cheveux)
  const overallLightness = skinLab.L * 0.65 + hairLab.L * 0.35;

  // 6. Évaluation de la distance aux 12 profils saisonniers
  // Chaque profil est caractérisé par un vecteur cible [warmth, lightness, chroma, contrast]
  const seasonTargets = [
    { id: 'printemps_clair', warmth: 5.5, lightness: 72, chroma: 20, contrast: 18 },
    { id: 'printemps_chaud', warmth: 10.5, lightness: 63, chroma: 25, contrast: 24 },
    { id: 'printemps_vif', warmth: 6.5, lightness: 60, chroma: 29, contrast: 34 },
    { id: 'ete_clair', warmth: -4.5, lightness: 73, chroma: 17, contrast: 17 },
    { id: 'ete_doux', warmth: -3.5, lightness: 61, chroma: 14, contrast: 16 },
    { id: 'ete_froid', warmth: -8.5, lightness: 58, chroma: 20, contrast: 26 },
    { id: 'automne_doux', warmth: 4.5, lightness: 57, chroma: 16, contrast: 18 },
    { id: 'automne_chaud', warmth: 11.0, lightness: 50, chroma: 24, contrast: 25 },
    { id: 'automne_profond', warmth: 6.0, lightness: 40, chroma: 23, contrast: 33 },
    { id: 'hiver_profond', warmth: -5.0, lightness: 38, chroma: 22, contrast: 38 },
    { id: 'hiver_froid', warmth: -9.5, lightness: 49, chroma: 24, contrast: 34 },
    { id: 'hiver_vif', warmth: -4.5, lightness: 54, chroma: 30, contrast: 42 }
  ];

  const scoredSeasons = seasonTargets.map((target) => {
    const dWarmth = (warmthIndex - target.warmth) / 4.5;
    const dLight = (overallLightness - target.lightness) / 10.0;
    const dChroma = (skinChroma - target.chroma) / 5.5;
    const dContrast = (overallContrast - target.contrast) / 8.0;
    const dist = Math.sqrt(
      1.45 * dWarmth * dWarmth +
      1.15 * dLight * dLight +
      0.90 * dChroma * dChroma +
      1.00 * dContrast * dContrast
    );
    return { id: target.id, distance: dist };
  }).sort((a, b) => a.distance - b.distance);

  const primaryMatch = scoredSeasons[0];
  const secondaryMatch = scoredSeasons[1];
  const separationMargin = secondaryMatch.distance - primaryMatch.distance;
  const isAmbiguous = separationMargin < 0.35 || faceSkinRatio < 0.45;

  // Calcul transparent de l'indice de confiance méthodologique
  let confidenceScore = 82;
  const qualityWarnings = [];

  if (faceSkinRatio < 0.45) {
    confidenceScore -= 12;
    qualityWarnings.push('La zone du visage occupe une portion réduite du cadre ; rapprochez-vous légèrement pour plus de précision.');
  }
  if (Math.abs(scaleR - 1) > 0.08 || Math.abs(scaleB - 1) > 0.08) {
    confidenceScore -= 10;
    qualityWarnings.push('Un léger éclairage ambiant coloré a été détecté et partiellement compensé.');
  }
  if (isAmbiguous) {
    confidenceScore -= 10;
    qualityWarnings.push('Vos caractéristiques se situent à la frontière entre deux sous-saisons proches ; nous vous présentons également le profil secondaire.');
  }

  confidenceScore = Math.max(45, Math.min(94, Math.round(confidenceScore)));
  const confidenceLabel = confidenceScore >= 78
    ? 'Bonne cohérence des mesures sur cette photo'
    : 'Mesures intermédiaires (profil frontière ou éclairage perfectible)';

  const primaryProfile = SEASON_PROFILES[primaryMatch.id];
  const secondaryProfile = SEASON_PROFILES[secondaryMatch.id];

  return {
    ok: true,
    seasonId: primaryProfile.id,
    seasonName: primaryProfile.name,
    family: primaryProfile.family,
    isAmbiguous,
    secondarySeason: isAmbiguous ? {
      id: secondaryProfile.id,
      name: secondaryProfile.name,
      description: secondaryProfile.description
    } : null,
    confidence: {
      score: confidenceScore,
      label: confidenceLabel,
      methodologyNote: 'Cet indice évalue la netteté de la photo, la neutralité de l\'éclairage ambiant et l\'écart mathématique entre le 1er et le 2e profil en espace CIELAB. Il ne constitue pas une mesure spectrométrique clinique.'
    },
    metrics: {
      skinLab: {
        L: Number(skinLab.L.toFixed(1)),
        a: Number(skinLab.a.toFixed(1)),
        b: Number(skinLab.b.toFixed(1))
      },
      hairLab: {
        L: Number(hairLab.L.toFixed(1)),
        a: Number(hairLab.a.toFixed(1)),
        b: Number(hairLab.b.toFixed(1))
      },
      warmthIndex: Number(warmthIndex.toFixed(2)),
      undertoneLabel: warmthIndex > 2.5 ? 'Chaud (Doré)' : warmthIndex < -2.5 ? 'Froid (Rosé)' : 'Neutre équilibré',
      itaAngle: Number(itaAngle.toFixed(1)),
      skinChroma: Number(skinChroma.toFixed(1)),
      overallContrast: Number(overallContrast.toFixed(1)),
      contrastLabel: overallContrast > 30 ? 'Élevé' : overallContrast < 20 ? 'Doux / Faible' : 'Moyen',
      overallLightness: Number(overallLightness.toFixed(1)),
      clothingIgnoredCount: clothingSamples.length
    },
    profile: primaryProfile,
    qualityWarnings,
    limitations: 'Analyse réalisée localement à partir d\'une photographie non calibrée. Les capteurs et la balance des blancs automatique des smartphones peuvent légèrement modifier la température apparente.'
  };
}

module.exports = {
  SEASON_PROFILES,
  rgbToLab,
  deltaE,
  analyzeImageGrid
};
