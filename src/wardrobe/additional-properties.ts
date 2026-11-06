export interface PropertyItem {
  id: number;
  name: string;
}

export interface ColorItem extends PropertyItem {
  hex: string;
  hexCodes: string[];
}

export const SEASONS: PropertyItem[] = [
  {
    id: 1,
    name: 'Autumn',
  },
  {
    id: 2,
    name: 'Monsoon',
  },
  {
    id: 3,
    name: 'Spring',
  },
  {
    id: 4,
    name: 'Summer',
  },
  {
    id: 5,
    name: 'Winter',
  },
];

export const OCCASIONS: PropertyItem[] = [
  {
    id: 1,
    name: 'Everyday',
  },
  {
    id: 2,
    name: 'Work',
  },
  {
    id: 3,
    name: 'Date',
  },
  {
    id: 4,
    name: 'Formal',
  },
  {
    id: 5,
    name: 'Outing',
  },
  {
    id: 6,
    name: 'Home / Indoor',
  },
  {
    id: 7,
    name: 'Sports',
  },
  {
    id: 8,
    name: 'Special',
  },
  {
    id: 9,
    name: 'Beach',
  },
  {
    id: 10,
    name: 'Festival',
  },
  {
    id: 11,
    name: 'Others',
  },
];

export const COLORS: ColorItem[] = [
  {
    id: 1,
    name: 'White',
    hex: '#FFFFFF',
    hexCodes: ['#FFFFFF'],
  },
  {
    id: 2,
    name: 'Beige',
    hex: '#E4D5B7',
    hexCodes: ['#E4D5B7'],
  },
  {
    id: 3,
    name: 'Light Gray',
    hex: '#D1D5DB',
    hexCodes: ['#D1D5DB'],
  },
  {
    id: 4,
    name: 'Dark Gray',
    hex: '#4B5563',
    hexCodes: ['#4B5563'],
  },
  {
    id: 5,
    name: 'Black',
    hex: '#000000',
    hexCodes: ['#000000'],
  },
  {
    id: 6,
    name: 'Yellow',
    hex: '#FACC15',
    hexCodes: ['#FACC15'],
  },
  {
    id: 7,
    name: 'Orange',
    hex: '#F97316',
    hexCodes: ['#F97316'],
  },
  {
    id: 8,
    name: 'Coral',
    hex: '#FF6F61',
    hexCodes: ['#FF6F61'],
  },
  {
    id: 9,
    name: 'Red',
    hex: '#DC2626',
    hexCodes: ['#DC2626'],
  },
  {
    id: 10,
    name: 'Pink',
    hex: '#F472B6',
    hexCodes: ['#F472B6'],
  },
  {
    id: 11,
    name: 'Dark Pink',
    hex: '#DB2777',
    hexCodes: ['#DB2777'],
  },
  {
    id: 12,
    name: 'Light Green',
    hex: '#7ACC85',
    hexCodes: ['#7ACC85'],
  },
  {
    id: 13,
    name: 'Green',
    hex: '#2E7D32',
    hexCodes: ['#2E7D32'],
  },
  {
    id: 14,
    name: 'Teal',
    hex: '#0D9488',
    hexCodes: ['#0D9488'],
  },
  {
    id: 15,
    name: 'Khaki',
    hex: '#B8A97A',
    hexCodes: ['#B8A97A'],
  },
  {
    id: 16,
    name: 'Sky Blue',
    hex: '#60A5FA',
    hexCodes: ['#60A5FA'],
  },
  {
    id: 17,
    name: 'Blue',
    hex: '#2563EB',
    hexCodes: ['#2563EB'],
  },
  {
    id: 18,
    name: 'Navy',
    hex: '#1E3A8A',
    hexCodes: ['#1E3A8A'],
  },
  {
    id: 19,
    name: 'Purple',
    hex: '#7E22CE',
    hexCodes: ['#7E22CE'],
  },
  {
    id: 20,
    name: 'Brown',
    hex: '#7C471E',
    hexCodes: ['#7C471E'],
  },
  {
    id: 21,
    name: 'Dark Brown',
    hex: '#3D2314',
    hexCodes: ['#3D2314'],
  },
  {
    id: 22,
    name: 'Magenta',
    hex: '#C026D3',
    hexCodes: ['#C026D3'],
  },
  {
    id: 23,
    name: 'Gold',
    hex: '#D49B24',
    hexCodes: ['#D49B24'],
  },
  {
    id: 24,
    name: 'Colorful',
    hex: '#EC4899',
    hexCodes: [
      '#EF4444',
      '#F97316',
      '#FACC15',
      '#10B981',
      '#3B82F6',
      '#8B5CF6',
      '#EC4899',
    ],
  },
];

export const GARMENT_PRINT: PropertyItem[] = [
  {
    id: 1,
    name: 'Solid',
  },
  {
    id: 2,
    name: 'Geometric',
  },
  {
    id: 3,
    name: 'Graphic',
  },
  {
    id: 4,
    name: 'Animal',
  },
  {
    id: 5,
    name: 'Floral',
  },
  {
    id: 6,
    name: 'Tropical',
  },
  {
    id: 7,
    name: 'Color Block',
  },
  {
    id: 8,
    name: 'Repeated',
  },
  {
    id: 9,
    name: 'Tie Dye',
  },
  {
    id: 10,
    name: 'Others',
  },
];

export const GARMENT_LOOK: PropertyItem[] = [
  {
    id: 1,
    name: 'Comfortable',
  },
  {
    id: 2,
    name: 'Casual',
  },
  {
    id: 3,
    name: 'Business Casual',
  },
  {
    id: 4,
    name: 'Formal',
  },
  {
    id: 5,
    name: 'Classic',
  },
  {
    id: 6,
    name: 'Minimal',
  },
  {
    id: 7,
    name: 'Luxury',
  },
  {
    id: 8,
    name: 'Sporty',
  },
  {
    id: 9,
    name: 'Kidcore',
  },
  {
    id: 10,
    name: 'Artistic',
  },
  {
    id: 11,
    name: 'Traditional',
  },
  {
    id: 12,
    name: 'Other',
  },
];

export const GARMENT_LOOKS: PropertyItem[] = GARMENT_LOOK;

export const GARMENT_FITS: PropertyItem[] = [
  {
    id: 1,
    name: 'Slim',
  },
  {
    id: 2,
    name: 'Regular',
  },
  {
    id: 3,
    name: 'Skinny',
  },
  {
    id: 4,
    name: 'Oversized',
  },
  {
    id: 5,
    name: 'Other',
  },
];

export const LOOKUPS = {
  seasonsById: new Map(SEASONS.map((i) => [i.id, i.name])),
  seasonsByName: new Map(SEASONS.map((i) => [i.name.toLowerCase(), i.id])),

  occasionsById: new Map(OCCASIONS.map((i) => [i.id, i.name])),
  occasionsByName: new Map(OCCASIONS.map((i) => [i.name.toLowerCase(), i.id])),

  printsById: new Map(GARMENT_PRINT.map((i) => [i.id, i.name])),
  printsByName: new Map(GARMENT_PRINT.map((i) => [i.name.toLowerCase(), i.id])),
  patternsById: new Map(GARMENT_PRINT.map((i) => [i.id, i.name])),
  patternsByName: new Map(
    GARMENT_PRINT.map((i) => [i.name.toLowerCase(), i.id]),
  ),

  looksById: new Map(GARMENT_LOOK.map((i) => [i.id, i.name])),
  looksByName: new Map(GARMENT_LOOK.map((i) => [i.name.toLowerCase(), i.id])),
  stylesById: new Map(GARMENT_LOOK.map((i) => [i.id, i.name])),
  stylesByName: new Map(GARMENT_LOOK.map((i) => [i.name.toLowerCase(), i.id])),

  fitsById: new Map(GARMENT_FITS.map((i) => [i.id, i.name])),
  fitsByName: new Map(GARMENT_FITS.map((i) => [i.name.toLowerCase(), i.id])),

  colorsById: new Map(COLORS.map((i) => [i.id, i])),
  colorsByName: new Map(COLORS.map((i) => [i.name.toLowerCase(), i])),
};

export const SUBCATEGORIES_BY_CATEGORY: Record<string, string[]> = {
  tops: [
    'T-shirt',
    'Polo',
    'Full Sleeve T-shirt',
    'Shirt',
    'Sweater',
    'Pullover',
    'Hoodie',
    'Activewear',
    'Blouse',
    'Crop Top',
    'Henly',
    'Tube Top',
    'Undertops',
    'Vest',
    'Others',
  ],
  bottoms: [
    'Shorts',
    'Jeans',
    'Trousers',
    'Chinos',
    'Formal Pants',
    'Cargo Pants',
    'Track Pants',
    'Tights',
    'Skirt',
    'Sharara',
    'Underbottoms',
    'Others',
  ],
  outerwear: ['Coat', 'Blazer', 'Jacket', 'Zip-ups', 'Others'],
  footwear: [
    'Sneakers',
    'Slip Ons / Slides',
    'Running Shoes',
    'Loafers',
    'Pumps',
    'Sandals',
    'Boots',
    'Others',
  ],
  headwear: ['Cap', 'Hat', 'Beanie', 'Others'],
  accessories: [
    'Earrings',
    'Chains',
    'Bracelets',
    'Rings',
    'Badges / Brooches',
    'Others',
  ],
  other: [
    'Swimwear',
    'Hair-accessories',
    'Glasses',
    'Neckties',
    'Shawl',
    'Winter Scarves',
    'Watch',
    'Gloves',
    'Belt',
    'Socks',
    'Others',
  ],
};

export const SUBCATEGORY_SORT_ORDER: readonly string[] = [
  't-shirt',
  'polo',
  'full sleeve t-shirt',
  'shirt',
  'sweater',
  'pullover',
  'hoodie',
];

export function getSubCategoryRank(sub?: string | null): number {
  if (!sub || !sub.trim()) return 999;
  const normalized = sub.trim().toLowerCase();
  const idx = SUBCATEGORY_SORT_ORDER.indexOf(normalized);
  if (idx >= 0) {
    return idx;
  }
  if (normalized === 'others' || normalized === 'other') return 800;
  return 700;
}

export function compareSubCategories(
  subA?: string | null,
  subB?: string | null,
  direction = 1,
): number {
  const hasA = subA != null && subA.trim() !== '';
  const hasB = subB != null && subB.trim() !== '';
  if (!hasA && !hasB) return 0;
  if (!hasA) return 1;
  if (!hasB) return -1;

  const a = subA.trim();
  const b = subB.trim();
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  if (aLower === bLower) return 0;

  const rankA = getSubCategoryRank(aLower);
  const rankB = getSubCategoryRank(bLower);

  if (rankA !== rankB) {
    return direction * (rankA - rankB);
  }

  return (
    direction *
    a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })
  );
}

export function getSubcategoriesForCategory(
  category?: string | null,
): string[] {
  if (!category) return [];
  const normalized = category.trim().toLowerCase();
  return SUBCATEGORIES_BY_CATEGORY[normalized] ?? [];
}

export function normalizeSubCategory(
  category?: string | null,
  subCategory?: string | null,
): string | undefined {
  if (!subCategory || !subCategory.trim()) return undefined;
  const allowed = getSubcategoriesForCategory(category);
  if (allowed.length === 0) return undefined;
  const subLower = subCategory.trim().toLowerCase();

  return allowed.find((item) => {
    const itemLower = item.toLowerCase();
    if (itemLower === subLower) return true;
    if (
      (itemLower === 'others' && subLower === 'other') ||
      (itemLower === 'other' && subLower === 'others')
    ) {
      return true;
    }
    return false;
  });
}
