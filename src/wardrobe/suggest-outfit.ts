import { Garment } from '../dal/entity/garment.entity';
import { GarmentCategory } from './garment-category.enum';

// ponytail: naive heuristic, no color/formality/weather rules. Garments have
// no formality or warmth tag to rule on; add those fields first if needed.
const POOL = 3;

/**
 * Picks one of the POOL least-recently-worn garments (never-worn first, ties
 * broken randomly so "shuffle" keeps surfacing new items).
 */
function pick(
  items: Garment[],
  lastWorn: Map<number, Date>,
  rand: () => number,
): Garment | undefined {
  const stalest = items
    .map((g) => ({
      g,
      worn: lastWorn.get(g.id)?.getTime() ?? 0,
      tie: rand(),
    }))
    .sort((a, b) => a.worn - b.worn || a.tie - b.tie)
    .slice(0, POOL);
  return stalest[Math.floor(rand() * stalest.length)]?.g;
}

/** One dress, or top + bottom, plus footwear when the closet has any. */
export function suggestOutfit(
  garments: Garment[],
  lastWorn: Map<number, Date>,
  rand: () => number = Math.random,
): Garment[] {
  const of = (c: GarmentCategory) => garments.filter((g) => g.category === c);
  const dresses = of(GarmentCategory.DRESSES);
  const tops = of(GarmentCategory.TOPS);
  const bottoms = of(GarmentCategory.BOTTOMS);

  const useDress =
    dresses.length > 0 && (!tops.length || !bottoms.length || rand() < 0.5);
  const body = useDress
    ? [pick(dresses, lastWorn, rand)]
    : [pick(tops, lastWorn, rand), pick(bottoms, lastWorn, rand)];

  return [...body, pick(of(GarmentCategory.FOOTWEAR), lastWorn, rand)].filter(
    (g): g is Garment => g !== undefined,
  );
}
