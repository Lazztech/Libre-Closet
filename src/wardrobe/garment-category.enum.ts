export enum GarmentCategory {
  TOPS = 'tops',
  BOTTOMS = 'bottoms',
  OUTERWEAR = 'outerwear',
  FOOTWEAR = 'footwear',
  HEADWEAR = 'headwear',
  ACCESSORIES = 'accessories',
  OTHER = 'other',
  BAGS = 'bags',
  DRESSES = 'dresses',
}

export const CATEGORY_SORT_ORDER: readonly string[] = [
  'tops',
  'bottoms',
  'outerwear',
  'footwear',
  'headwear',
  'accessories',
  'other',
];

export function getCategoryRank(cat?: string | null): number {
  if (!cat || !cat.trim()) return 999;
  const normalized = cat.trim().toLowerCase();
  const idx = CATEGORY_SORT_ORDER.indexOf(normalized);
  if (idx >= 0) {
    if (normalized === 'other') return 800;
    return idx;
  }
  return 700;
}

export function compareCategories(
  catA?: string | null,
  catB?: string | null,
  direction = 1,
): number {
  const hasA = catA != null && catA.trim() !== '';
  const hasB = catB != null && catB.trim() !== '';
  if (!hasA && !hasB) return 0;
  if (!hasA) return 1;
  if (!hasB) return -1;

  const a = catA.trim().toLowerCase();
  const b = catB.trim().toLowerCase();
  if (a === b) return 0;

  const rankA = getCategoryRank(a);
  const rankB = getCategoryRank(b);

  if (rankA !== rankB) {
    return direction * (rankA - rankB);
  }

  return (
    direction *
    a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })
  );
}
