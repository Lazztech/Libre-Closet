import { Garment } from '../dal/entity/garment.entity';
import { suggestOutfit } from './suggest-outfit';

const g = (id: number, category: string) => ({ id, category }) as Garment;
const day = (n: number) => new Date(2026, 9, n);

describe('suggestOutfit', () => {
  const closet = [
    ...[1, 2, 3, 4, 5].map((id) => g(id, 'tops')),
    ...[10, 11, 12, 13].map((id) => g(id, 'bottoms')),
    g(20, 'footwear'),
  ];

  it('returns top + bottom + footwear', () => {
    const cats = suggestOutfit(closet, new Map()).map((x) => x.category);
    expect(cats).toEqual(['tops', 'bottoms', 'footwear']);
  });

  it('never picks the most recently worn garments while staler ones exist', () => {
    // tops 1-3 worn recently, 4-5 never worn -> pool is 4, 5, then stalest worn
    const lastWorn = new Map([
      [1, day(9)],
      [2, day(10)],
      [3, day(8)],
    ]);
    for (let i = 0; i < 50; i++) {
      const top = suggestOutfit(closet, lastWorn)[0];
      expect([3, 4, 5]).toContain(top.id);
    }
  });

  it('uses a dress when there are no tops or bottoms', () => {
    const out = suggestOutfit([g(30, 'dresses')], new Map());
    expect(out.map((x) => x.id)).toEqual([30]);
  });

  it('skips missing categories instead of failing', () => {
    expect(suggestOutfit([], new Map())).toEqual([]);
  });
});
