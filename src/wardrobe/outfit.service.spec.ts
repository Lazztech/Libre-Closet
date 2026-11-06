import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { I18nContext } from 'nestjs-i18n';
import {
  OutfitService,
  CATEGORY_ANATOMICAL_ORDER,
  DEFAULT_OUTFIT_BUILDER_CATEGORIES,
  orderOutfitGarments,
} from './outfit.service';
import { Outfit } from '../dal/entity/outfit.entity';
import { Garment } from '../dal/entity/garment.entity';
import { User } from '../dal/entity/user.entity';
import { GarmentService } from './garment.service';

describe('OutfitService - buildCategoryRows', () => {
  let service: OutfitService;
  let mockOutfitRepo: any;
  let mockGarmentRepo: any;
  let mockUserRepo: any;
  let mockGarmentService: any;
  let mockI18n: I18nContext;
  let mockEm: any;

  beforeEach(async () => {
    mockEm = {
      persistAndFlush: jest.fn().mockResolvedValue(undefined),
      flush: jest.fn().mockResolvedValue(undefined),
    };
    mockOutfitRepo = {
      create: jest.fn((dto) => ({
        ...dto,
        garments: { set: jest.fn() },
      })),
      findOne: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      getEntityManager: jest.fn(() => mockEm),
    };
    mockGarmentRepo = {
      find: jest.fn().mockResolvedValue([]),
    };
    mockUserRepo = {
      findOneOrFail: jest.fn().mockResolvedValue({ id: 1 }),
    };
    mockGarmentService = {
      resolveCategoryLabel: jest.fn((cat: string) => cat.toUpperCase()),
    };
    mockI18n = {
      t: jest.fn((key: string) => key),
    } as unknown as I18nContext;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutfitService,
        { provide: getRepositoryToken(Outfit), useValue: mockOutfitRepo },
        { provide: getRepositoryToken(Garment), useValue: mockGarmentRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: GarmentService, useValue: mockGarmentService },
      ],
    }).compile();

    service = module.get<OutfitService>(OutfitService);
  });

  it('exposes correct category order and default outfit builder categories', () => {
    expect(DEFAULT_OUTFIT_BUILDER_CATEGORIES).toEqual([
      'tops',
      'bottoms',
      'outerwear',
      'footwear',
    ]);
    expect(CATEGORY_ANATOMICAL_ORDER).toContain('headwear');
    expect(CATEGORY_ANATOMICAL_ORDER.indexOf('tops')).toBeLessThan(
      CATEGORY_ANATOMICAL_ORDER.indexOf('bottoms'),
    );
    expect(CATEGORY_ANATOMICAL_ORDER.indexOf('bottoms')).toBeLessThan(
      CATEGORY_ANATOMICAL_ORDER.indexOf('outerwear'),
    );
    expect(CATEGORY_ANATOMICAL_ORDER.indexOf('outerwear')).toBeLessThan(
      CATEGORY_ANATOMICAL_ORDER.indexOf('footwear'),
    );
    expect(CATEGORY_ANATOMICAL_ORDER.indexOf('footwear')).toBeLessThan(
      CATEGORY_ANATOMICAL_ORDER.indexOf('headwear'),
    );
    expect(CATEGORY_ANATOMICAL_ORDER.indexOf('headwear')).toBeLessThan(
      CATEGORY_ANATOMICAL_ORDER.indexOf('accessories'),
    );
    expect(CATEGORY_ANATOMICAL_ORDER.indexOf('accessories')).toBeLessThan(
      CATEGORY_ANATOMICAL_ORDER.indexOf('other'),
    );
  });

  it('shows only Tops, Bottoms, Outerwear, and Footwear in category priority order by default when building an outfit', () => {
    const garments = [
      { id: 1, category: 'footwear', name: 'Boots' },
      { id: 2, category: 'accessories', name: 'Necklace' },
      { id: 3, category: 'outerwear', name: 'Coat' },
      { id: 4, category: 'tops', name: 'Shirt' },
      { id: 5, category: 'bottoms', name: 'Jeans' },
      { id: 6, category: 'bags', name: 'Tote' },
      { id: 7, category: 'headwear', name: 'Beanie' },
    ] as unknown as Garment[];

    const rows = service.buildCategoryRows(
      garments,
      [],
      mockI18n,
      undefined,
      true, // defaultOnly
    );

    // Only tops, bottoms, outerwear, footwear, in that exact order
    expect(rows.map((r) => r.value)).toEqual([
      'tops',
      'bottoms',
      'outerwear',
      'footwear',
    ]);
  });

  it('returns all categories ordered by category priority when defaultOnly is false', () => {
    const garments = [
      { id: 1, category: 'footwear', name: 'Boots' },
      { id: 2, category: 'accessories', name: 'Necklace' },
      { id: 3, category: 'outerwear', name: 'Coat' },
      { id: 4, category: 'tops', name: 'Shirt' },
      { id: 5, category: 'bottoms', name: 'Jeans' },
      { id: 6, category: 'headwear', name: 'Beanie' },
      { id: 7, category: 'bags', name: 'Tote' },
    ] as unknown as Garment[];

    const rows = service.buildCategoryRows(
      garments,
      [],
      mockI18n,
      undefined,
      false, // all categories
    );

    expect(rows.map((r) => r.value)).toEqual([
      'tops',
      'bottoms',
      'outerwear',
      'footwear',
      'headwear',
      'accessories',
      'bags',
    ]);
  });

  it('preserves saved slot order when slots are provided', () => {
    const garments = [
      { id: 1, category: 'footwear', name: 'Boots' },
      { id: 2, category: 'tops', name: 'Shirt' },
      { id: 3, category: 'outerwear', name: 'Coat' },
    ] as unknown as Garment[];

    const slots = [
      { category: 'footwear', garmentId: 1 },
      { category: 'outerwear', garmentId: 3 },
      { category: 'tops', garmentId: 2 },
    ];

    const rows = service.buildCategoryRows(
      garments,
      [1, 2, 3],
      mockI18n,
      slots,
    );

    expect(rows.map((r) => r.value)).toEqual(['footwear', 'outerwear', 'tops']);
  });

  describe('outfit rating', () => {
    it('creates an outfit with a 1-5 star rating', async () => {
      const outfit = await service.create(
        {
          name: 'Summer Look',
          notes: 'Sunny day',
          rating: 5,
          slots: [{ category: 'tops', garmentId: 1 }],
        },
        1,
      );

      expect(mockOutfitRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Summer Look',
          rating: 5,
        }),
      );
      expect(mockEm.persistAndFlush).toHaveBeenCalled();
      expect(outfit.rating).toBe(5);
    });

    it('updates and clears an outfit rating', async () => {
      const existingOutfit: any = {
        id: 10,
        name: 'Workwear',
        rating: 4,
        owner: { id: 1 },
        garments: {
          getItems: jest.fn().mockReturnValue([]),
          set: jest.fn(),
        },
      };
      existingOutfit.__helper = {
        assign: (data: any) => Object.assign(existingOutfit, data),
      };
      mockOutfitRepo.findOne.mockResolvedValue(existingOutfit);

      const updated = await service.update(
        10,
        {
          rating: 3,
        },
        1,
      );
      expect(updated.rating).toBe(3);
      expect(mockEm.flush).toHaveBeenCalled();

      // Clear rating
      const cleared = await service.update(
        10,
        {
          rating: null as any,
        },
        1,
      );
      expect(cleared.rating).toBeNull();
    });

    it('creates an outfit with look, occasions, and seasons metadata', async () => {
      const outfit = await service.create(
        {
          name: 'Autumn Casual',
          look: 'Casual',
          occasions: 'Work,Daily',
          seasons: 'Autumn,Winter',
        },
        1,
      );

      expect(mockOutfitRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Autumn Casual',
          look: 'Casual',
          occasions: 'Work,Daily',
          seasons: 'Autumn,Winter',
        }),
      );
      expect(outfit.look).toBe('Casual');
      expect(outfit.occasions).toBe('Work,Daily');
      expect(outfit.seasons).toBe('Autumn,Winter');
    });

    it('updates look, occasions, and seasons on an outfit', async () => {
      const existingOutfit: any = {
        id: 11,
        name: 'Party Outfit',
        look: 'Casual',
        occasions: 'Date',
        seasons: 'Summer',
        owner: { id: 1 },
        garments: {
          getItems: jest.fn().mockReturnValue([]),
          set: jest.fn(),
        },
      };
      existingOutfit.__helper = {
        assign: (data: any) => Object.assign(existingOutfit, data),
      };
      mockOutfitRepo.findOne.mockResolvedValue(existingOutfit);

      const updated = await service.update(
        11,
        {
          look: 'Formal',
          occasions: 'Special,Party',
          seasons: 'Spring,Summer',
        },
        1,
      );

      expect(updated.look).toBe('Formal');
      expect(updated.occasions).toBe('Special,Party');
      expect(updated.seasons).toBe('Spring,Summer');
      expect(mockEm.flush).toHaveBeenCalled();
    });
  });

  describe('buildRow and garment picker', () => {
    it('generates a row with unique rowId and proper navigation indexes', () => {
      const garments = [
        { id: 1, name: 'Shirt 1', category: 'tops' },
        { id: 2, name: 'Shirt 2', category: 'tops' },
      ] as unknown as Garment[];

      const row = service.buildRow(
        'tops',
        garments,
        2,
        mockI18n,
        'custom-row-id',
      );
      expect(row.rowId).toBe('custom-row-id');
      expect(row.value).toBe('tops');
      expect(row.currentIndex).toBe(2);
      expect(row.prevIndex).toBe(1);
      expect(row.nextIndex).toBe(0);
      expect(row.currentGarment?.name).toBe('Shirt 2');
      expect(row.garmentId).toBe(2);
    });

    it('handles empty / zero index (none selected) gracefully', () => {
      const garments = [
        { id: 1, name: 'Shirt 1', category: 'tops' },
      ] as unknown as Garment[];

      const row = service.buildRow('tops', garments, 0, mockI18n);
      expect(row.currentIndex).toBe(0);
      expect(row.prevIndex).toBe(1);
      expect(row.nextIndex).toBe(1);
      expect(row.currentGarment).toBeNull();
      expect(row.garmentId).toBeNull();
      expect(row.rowId).toMatch(/^outfit-row-tops-/);
    });
  });

  describe('findPaginated', () => {
    it('returns first 50 outfits and hasMore correctly', async () => {
      const dummyOutfits = Array.from({ length: 50 }, (_, i) => ({
        id: 100 - i,
        name: `Outfit ${100 - i}`,
      })) as unknown as Outfit[];
      mockOutfitRepo.findAndCount.mockResolvedValueOnce([dummyOutfits, 75]);

      const result = await service.findPaginated(1, 50, 0);

      expect(mockOutfitRepo.findAndCount).toHaveBeenCalledWith(
        { owner: { id: 1 } },
        {
          populate: ['garments', 'garments.photo'],
          orderBy: { id: 'desc' },
          limit: 50,
          offset: 0,
        },
      );
      expect(result.outfits).toHaveLength(50);
      expect(result.total).toBe(75);
      expect(result.hasMore).toBe(true);
    });

    it('sets hasMore to false when all outfits are fetched', async () => {
      const dummyOutfits = [{ id: 1, name: 'Outfit 1' }] as unknown as Outfit[];
      mockOutfitRepo.findAndCount.mockResolvedValueOnce([dummyOutfits, 1]);

      const result = await service.findPaginated(undefined, 50, 0);

      expect(mockOutfitRepo.findAndCount).toHaveBeenCalledWith(
        { owner: null },
        {
          populate: ['garments', 'garments.photo'],
          orderBy: { id: 'desc' },
          limit: 50,
          offset: 0,
        },
      );
      expect(result.outfits).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('orderOutfitGarments & custom preferences', () => {
    const coat = {
      id: 10,
      category: 'outerwear',
      name: 'Winter Coat',
    } as Garment;
    const shirt = {
      id: 20,
      category: 'tops',
      name: 'Cotton T-Shirt',
    } as Garment;
    const jeans = {
      id: 30,
      category: 'bottoms',
      name: 'Blue Jeans',
    } as Garment;
    const boots = {
      id: 40,
      category: 'footwear',
      name: 'Leather Boots',
    } as Garment;

    it('orders garments by CATEGORY_SORT_ORDER by default when outfit has no slots', () => {
      const outfit = {
        id: 1,
        garments: {
          getItems: () => [boots, coat, jeans, shirt], // random db order
        },
      } as unknown as Outfit;

      const ordered = orderOutfitGarments(outfit);
      // Canonical order: tops -> bottoms -> outerwear -> footwear
      expect(ordered.map((g) => g.id)).toEqual([20, 30, 10, 40]);
      expect(ordered.map((g) => g.category)).toEqual([
        'tops',
        'bottoms',
        'outerwear',
        'footwear',
      ]);
    });

    it('preserves the user custom slot preference over default category order (e.g. outerwear before tops)', () => {
      const outfit = {
        id: 2,
        slots: [
          { category: 'outerwear', garmentId: 10 },
          { category: 'tops', garmentId: 20 },
          { category: 'bottoms', garmentId: 30 },
          { category: 'footwear', garmentId: 40 },
        ],
        garments: {
          getItems: () => [shirt, jeans, coat, boots],
        },
      } as unknown as Outfit;

      const ordered = orderOutfitGarments(outfit);
      expect(ordered.map((g) => g.id)).toEqual([10, 20, 30, 40]);
      expect(ordered.map((g) => g.category)).toEqual([
        'outerwear',
        'tops',
        'bottoms',
        'footwear',
      ]);
    });

    it('appends unslotted garments in CATEGORY_SORT_ORDER after custom slotted garments', () => {
      const outfit = {
        id: 3,
        slots: [
          { category: 'footwear', garmentId: 40 },
          { category: 'outerwear', garmentId: 10 },
        ],
        garments: {
          getItems: () => [shirt, jeans, coat, boots],
        },
      } as unknown as Outfit;

      const ordered = orderOutfitGarments(outfit);
      // Custom slots: footwear (40), outerwear (10); Remaining: tops (20), bottoms (30) in default category order
      expect(ordered.map((g) => g.id)).toEqual([40, 10, 20, 30]);
    });

    it('buildCategoryRows respects custom slot order when slots are passed', () => {
      const garments = [shirt, jeans, coat, boots];
      const slots = [
        { category: 'outerwear', garmentId: 10 },
        { category: 'tops', garmentId: 20 },
        { category: 'bottoms', garmentId: 30 },
      ];

      const rows = service.buildCategoryRows(
        garments,
        [10, 20, 30],
        mockI18n,
        slots,
      );

      expect(rows.map((r) => r.value)).toEqual([
        'outerwear',
        'tops',
        'bottoms',
      ]);
      expect(rows[0].currentGarment?.id).toBe(10);
      expect(rows[1].currentGarment?.id).toBe(20);
      expect(rows[2].currentGarment?.id).toBe(30);
    });

    it('buildCategoryRows appends any selected garments missing from slots in category order', () => {
      const garments = [shirt, jeans, coat, boots];
      // slots only has outerwear, but user also has boots (40) selected
      const slots = [{ category: 'outerwear', garmentId: 10 }];

      const rows = service.buildCategoryRows(
        garments,
        [10, 40],
        mockI18n,
        slots,
      );

      expect(rows.map((r) => r.value)).toEqual(['outerwear', 'footwear']);
      expect(rows[0].currentGarment?.id).toBe(10);
      expect(rows[1].currentGarment?.id).toBe(40);
    });
  });
});
