import { getRepositoryToken } from '@mikro-orm/nestjs';
import { Test, TestingModule } from '@nestjs/testing';
import { Garment } from '../dal/entity/garment.entity';
import { Outfit } from '../dal/entity/outfit.entity';
import { User } from '../dal/entity/user.entity';
import { OutfitCalendar } from '../dal/entity/outfit-calendar.entity';
import { FileService } from '../file/file-service.abstract';
import { WardrobeShareService } from '../wardrobe-share/wardrobe-share.service';
import { GarmentService } from './garment.service';
import { SEASONS, OCCASIONS, COLORS, LOOKUPS } from './additional-properties';

describe('GarmentService with Properties', () => {
  let service: GarmentService;
  let garmentRepo: any;
  let outfitRepo: any;
  let userRepo: any;
  let calendarRepo: any;
  let fileService: any;
  let shareService: any;

  beforeEach(async () => {
    garmentRepo = {
      create: jest.fn((dto) => ({ ...dto })),
      getEntityManager: jest.fn(() => ({
        persistAndFlush: jest.fn().mockResolvedValue(undefined),
        flush: jest.fn().mockResolvedValue(undefined),
      })),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
    };
    outfitRepo = {
      find: jest.fn().mockResolvedValue([]),
    };
    userRepo = {
      findOneOrFail: jest
        .fn()
        .mockResolvedValue({ id: 1, email: 'test@example.com' }),
    };
    calendarRepo = {
      count: jest.fn().mockResolvedValue(0),
      createQueryBuilder: jest.fn(() => ({
        join: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(3),
      })),
    };
    fileService = {
      storeImageFromFileUpload: jest.fn(),
      copyImage: jest.fn(),
      nobgFileName: jest.fn((name) => `nobg-${name}`),
      get: jest.fn(),
      storeNobgVariantFromStream: jest.fn(),
      delete: jest.fn(),
    };
    shareService = {
      canView: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GarmentService,
        {
          provide: getRepositoryToken(Garment),
          useValue: garmentRepo,
        },
        {
          provide: getRepositoryToken(Outfit),
          useValue: outfitRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
        {
          provide: getRepositoryToken(OutfitCalendar),
          useValue: calendarRepo,
        },
        {
          provide: FileService,
          useValue: fileService,
        },
        {
          provide: WardrobeShareService,
          useValue: shareService,
        },
      ],
    }).compile();

    service = module.get<GarmentService>(GarmentService);
  });

  it('creates a garment with all properties attributes', async () => {
    const garment = await service.create(
      {
        name: 'Classic Linen Shirt',
        category: 'tops',
        brand: 'Lazztech',
        color: 'Ivory,Navy',
        size: 'Medium',
        rating: 5,
        seasons: 'Spring,Summer',
        occasions: 'Work,Date',
        purchaseLink: 'https://example.com/linen-shirt',
        cost: 1499.5,
        print: 'Solid',
        look: 'Casual',
        fit: 'Regular',
      },
      1,
    );

    expect(garmentRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Classic Linen Shirt',
        rating: 5,
        seasons: 'Spring,Summer',
        occasions: 'Work,Date',
        purchaseLink: 'https://example.com/linen-shirt',
        cost: 1499.5,
        print: 'Solid',
        look: 'Casual',
        fit: 'Regular',
      }),
    );
    expect(garment.rating).toBe(5);
    expect(garment.cost).toBe(1499.5);
  });

  it('clones a garment copying over all properties', async () => {
    garmentRepo.findOne.mockResolvedValueOnce({
      id: 10,
      name: 'Original Shirt',
      category: 'tops',
      brand: 'Zara',
      rating: 4,
      seasons: 'Summer',
      occasions: 'Daily',
      purchaseLink: 'https://zara.com',
      cost: 2499,
      print: 'Striped',
      look: 'Casual',
      fit: 'Slim',
      photo: { fileName: 'photo.jpg' },
      owner: { id: 1 },
    });

    await service.clone(
      10,
      {
        name: 'Cloned Shirt',
        category: 'tops',
      },
      1,
    );

    expect(garmentRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Cloned Shirt',
        rating: 4,
        seasons: 'Summer',
        occasions: 'Daily',
        purchaseLink: 'https://zara.com',
        cost: 2499,
        print: 'Striped',
        look: 'Casual',
        fit: 'Slim',
      }),
    );
  });

  it('updates a garment with new properties', async () => {
    const existingGarment: any = {
      id: 5,
      name: 'Old Shirt',
      category: 'tops',
      owner: { id: 1 },
    };
    garmentRepo.findOne.mockResolvedValueOnce(existingGarment);

    await service.update(
      5,
      {
        rating: 5,
        cost: 1899,
        seasons: 'Fall,Winter',
        print: 'Geometric',
        look: 'Classic',
        fit: 'Regular',
      },
      1,
      1,
    );

    expect(existingGarment.rating).toBe(5);
    expect(existingGarment.cost).toBe(1899);
    expect(existingGarment.seasons).toBe('Fall,Winter');
    expect(existingGarment.print).toBe('Geometric');
    expect(existingGarment.look).toBe('Classic');
    expect(existingGarment.fit).toBe('Regular');
  });

  it('filters garments by season, occasion, and rating in findAll', async () => {
    await service.findAll(1, {
      season: 'Summer',
      occasion: 'Work',
      rating: 4,
    });

    expect(garmentRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        seasons: { $like: '%Summer%' },
        occasions: { $like: '%Work%' },
        rating: { $gte: 4 },
      }),
      expect.any(Object),
    );
  });

  it('creates a garment with a valid subcategory for its category', async () => {
    const garment = await service.create(
      {
        name: 'Graphic Tee',
        category: 'tops',
        subCategory: 't-shirt',
      },
      1,
    );

    expect(garmentRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Graphic Tee',
        category: 'tops',
        subCategory: 'T-shirt',
      }),
    );
    expect(garment.subCategory).toBe('T-shirt');
  });

  it('rejects an invalid subcategory not belonging to the chosen category', async () => {
    const garment = await service.create(
      {
        name: 'Misclassified Item',
        category: 'tops',
        subCategory: 'Sneakers', // Sneakers belongs to shoes/footwear, not tops
      },
      1,
    );

    expect(garmentRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Misclassified Item',
        category: 'tops',
        subCategory: undefined,
      }),
    );
    expect(garment.subCategory).toBeUndefined();
  });

  it('supports Undertops on tops and Underbottoms on bottoms', async () => {
    const hat = await service.create(
      {
        name: 'Grey Hat',
        category: 'headwear',
        subCategory: 'Hat',
      },
      1,
    );
    expect(hat.subCategory).toBe('Hat');

    const undertop = await service.create(
      {
        name: 'Tank Top',
        category: 'tops',
        subCategory: 'Undertops',
      },
      1,
    );
    expect(undertop.subCategory).toBe('Undertops');

    const underbottom = await service.create(
      {
        name: 'Boxers',
        category: 'bottoms',
        subCategory: 'Underbottoms',
      },
      1,
    );
    expect(underbottom.subCategory).toBe('Underbottoms');
  });

  it('filters garments by subCategory in findAll', async () => {
    await service.findAll(1, {
      category: 'tops',
      subCategory: 'T-shirt',
    });

    expect(garmentRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'tops',
        subCategory: 'T-shirt',
      }),
      expect.any(Object),
    );
  });

  it('counts wears for a garment using calendar query builder', async () => {
    const wears = await service.getWearsCount(1, 1);
    expect(wears).toBe(3);
    expect(calendarRepo.createQueryBuilder).toHaveBeenCalledWith('c');
  });

  describe('findGarmentOutfitsWithWearHistory', () => {
    it('returns outfits containing the garment sorted by creation date descending by default with wear dates', async () => {
      const mockGarment = {
        id: 10,
        name: 'Blue Jeans',
        category: 'bottoms',
        owner: { id: 1 },
      };
      garmentRepo.findOne.mockResolvedValue(mockGarment);

      const outfit1 = {
        id: 1,
        name: 'Older Worn Outfit',
        createdAt: new Date('2026-05-01T10:00:00Z'),
        garments: { getItems: () => [mockGarment] },
        slots: [],
      };
      const outfit2 = {
        id: 2,
        name: 'Newer Unworn Outfit',
        createdAt: new Date('2026-06-01T10:00:00Z'),
        garments: { getItems: () => [mockGarment] },
        slots: [],
      };

      outfitRepo.find.mockResolvedValue([outfit1, outfit2]);

      calendarRepo.find = jest.fn().mockResolvedValue([
        {
          id: 100,
          outfit: { id: 1 },
          date: new Date('2026-05-15T00:00:00Z'),
          wornAt: new Date('2026-05-15T09:00:00Z'),
        },
        {
          id: 101,
          outfit: { id: 1 },
          date: new Date('2026-05-20T00:00:00Z'),
          wornAt: new Date('2026-05-20T09:00:00Z'),
        },
      ]);

      const result = await service.findGarmentOutfitsWithWearHistory(10, 1);

      expect(result.garment).toBe(mockGarment);
      expect(result.outfits.length).toBe(2);

      // Default sort is descending by createdAt (outfit2 created in June, outfit1 created in May)
      expect(result.outfits[0].id).toBe(2);
      expect(result.outfits[0].isWorn).toBe(false);
      expect(result.outfits[0].createdAtStr).toBe('2026-06-01');
      expect(result.outfits[0].wornDates).toEqual([]);

      expect(result.outfits[1].id).toBe(1);
      expect(result.outfits[1].isWorn).toBe(true);
      expect(result.outfits[1].wornDates.map((w) => w.dateStr)).toEqual([
        '2026-05-15',
        '2026-05-20',
      ]);
    });

    it('sorts outfits by creation date ascending when sort=asc', async () => {
      const mockGarment = {
        id: 10,
        name: 'Blue Jeans',
        category: 'bottoms',
        owner: { id: 1 },
      };
      garmentRepo.findOne.mockResolvedValue(mockGarment);

      const outfit1 = {
        id: 1,
        name: 'Older Outfit',
        createdAt: new Date('2026-05-01T10:00:00Z'),
        garments: { getItems: () => [mockGarment] },
      };
      const outfit2 = {
        id: 2,
        name: 'Newer Outfit',
        createdAt: new Date('2026-06-01T10:00:00Z'),
        garments: { getItems: () => [mockGarment] },
      };

      outfitRepo.find.mockResolvedValue([outfit2, outfit1]);
      calendarRepo.find = jest.fn().mockResolvedValue([]);

      const result = await service.findGarmentOutfitsWithWearHistory(
        10,
        1,
        undefined,
        'asc',
      );

      expect(result.outfits[0].id).toBe(1);
      expect(result.outfits[1].id).toBe(2);
    });
  });

  it('exposes accurate properties lookup dictionaries', () => {
    expect(SEASONS.length).toBe(5);
    expect(OCCASIONS.length).toBe(11);
    expect(COLORS.length).toBe(24);

    expect(LOOKUPS.seasonsById.get(3)).toBe('Spring');
    expect(LOOKUPS.seasonsByName.get('spring')).toBe(3);
  });

  describe('sortGarments', () => {
    it('sorts by category with subCategory, color, and name as tie-breakers', () => {
      const garments = [
        {
          id: 1,
          name: 'B Tee',
          category: 'tops',
          subCategory: 'T-shirt',
          color: 'red',
        },
        {
          id: 2,
          name: 'A Tee',
          category: 'tops',
          subCategory: 'T-shirt',
          color: 'blue',
        },
        {
          id: 3,
          name: 'Jeans',
          category: 'bottoms',
          subCategory: 'Jeans',
          color: 'blue',
        },
        {
          id: 4,
          name: 'Shorts',
          category: 'bottoms',
          subCategory: 'Shorts',
          color: 'khaki',
        },
      ] as unknown as Garment[];

      const sorted = service.sortGarments(garments, 'category', 'asc');
      // tops comes before bottoms in wear priority order.
      // for tops: subCategory is both T-shirt, blue color comes before red color
      // for bottoms: Jeans comes before Shorts (subCategory tie breaker)
      expect(sorted.map((g) => g.id)).toEqual([2, 1, 3, 4]);
    });

    it('sorts by subCategory following priority order, then lexicographically, then others', () => {
      const garments = [
        { id: 1, name: 'Item 1', category: 'tops', subCategory: 'Hoodie' },
        { id: 2, name: 'Item 2', category: 'tops', subCategory: 'T-shirt' },
        { id: 3, name: 'Item 3', category: 'tops', subCategory: 'Blouse' },
        { id: 4, name: 'Item 4', category: 'tops', subCategory: 'Sweater' },
        { id: 5, name: 'Item 5', category: 'tops', subCategory: 'Activewear' },
        { id: 6, name: 'Item 6', category: 'tops', subCategory: 'Polo' },
        {
          id: 7,
          name: 'Item 7',
          category: 'tops',
          subCategory: 'Full Sleeve T-shirt',
        },
        { id: 8, name: 'Item 8', category: 'tops', subCategory: 'Shirt' },
        { id: 9, name: 'Item 9', category: 'tops', subCategory: 'Pullover' },
        { id: 10, name: 'Item 10', category: 'tops', subCategory: 'Others' },
      ] as unknown as Garment[];

      const sorted = service.sortGarments(garments, 'subCategory', 'asc');
      // Expected order:
      // 1. T-shirt (id: 2)
      // 2. Polo (id: 6)
      // 3. Full Sleeve T-shirt (id: 7)
      // 4. Shirt (id: 8)
      // 5. Sweater (id: 4)
      // 6. Pullover (id: 9)
      // 7. Hoodie (id: 1)
      // After Hoodie (lexicographical):
      // 8. Activewear (id: 5)
      // 9. Blouse (id: 3)
      // 10. Others (id: 10)
      expect(sorted.map((g) => g.id)).toEqual([2, 6, 7, 8, 4, 9, 1, 5, 3, 10]);
    });

    it('sorts by subCategory with category, color, and name as tie-breakers', () => {
      const garments = [
        {
          id: 1,
          name: 'Item 1',
          category: 'bottoms',
          subCategory: 'Others',
          color: 'red',
        },
        {
          id: 2,
          name: 'Item 2',
          category: 'tops',
          subCategory: 'Others',
          color: 'blue',
        },
        {
          id: 3,
          name: 'Item 3',
          category: 'tops',
          subCategory: 'Blouse',
          color: 'white',
        },
      ] as unknown as Garment[];

      const sorted = service.sortGarments(garments, 'subCategory', 'asc');
      // Blouse comes before Others.
      // For Others: category tops comes before bottoms
      expect(sorted.map((g) => g.id)).toEqual([3, 2, 1]);
    });

    it('sorts numbers correctly (rating descending and cost ascending) with nulls at the end', () => {
      const garments = [
        { id: 1, name: 'Unrated', rating: null, cost: 50 },
        { id: 2, name: 'Three Star', rating: 3, cost: 20 },
        { id: 3, name: 'Five Star', rating: 5, cost: 100 },
        { id: 4, name: 'One Star', rating: 1, cost: 10 },
      ] as unknown as Garment[];

      const sortedByRating = service.sortGarments(garments, 'rating', 'desc');
      // 5 -> 3 -> 1 -> null
      expect(sortedByRating.map((g) => g.id)).toEqual([3, 2, 4, 1]);

      const sortedByCost = service.sortGarments(garments, 'cost', 'asc');
      // 10 -> 20 -> 50 -> 100
      expect(sortedByCost.map((g) => g.id)).toEqual([4, 2, 1, 3]);
    });

    it('sorts words lexicographically with name', () => {
      const garments = [
        { id: 1, name: 'Zebra Tee' },
        { id: 2, name: 'Apple Hoodie' },
        { id: 3, name: 'Banana Shorts' },
      ] as unknown as Garment[];

      const sortedAsc = service.sortGarments(garments, 'name', 'asc');
      expect(sortedAsc.map((g) => g.name)).toEqual([
        'Apple Hoodie',
        'Banana Shorts',
        'Zebra Tee',
      ]);

      const sortedDesc = service.sortGarments(garments, 'name', 'desc');
      expect(sortedDesc.map((g) => g.name)).toEqual([
        'Zebra Tee',
        'Banana Shorts',
        'Apple Hoodie',
      ]);
    });

    it('sorts garments by category in wear priority order (tops, bottoms, outerwear, footwear, headwear, accessories, other)', () => {
      const garments = [
        { id: 1, category: 'other', name: 'Scarf' },
        { id: 2, category: 'accessories', name: 'Ring' },
        { id: 3, category: 'bottoms', name: 'Jeans' },
        { id: 4, category: 'footwear', name: 'Sneakers' },
        { id: 5, category: 'tops', name: 'T-Shirt', subCategory: 'T-shirt' },
        { id: 6, category: 'tops', name: 'Crop Top', subCategory: 'Crop Top' },
        { id: 7, category: 'headwear', name: 'Cap' },
        { id: 8, category: 'outerwear', name: 'Coat' },
      ] as unknown as Garment[];

      const sortedAsc = service.sortGarments(garments, 'category', 'asc');
      expect(sortedAsc.map((g) => `${g.category}:${g.name}`)).toEqual([
        'tops:T-Shirt', // subCategory T-shirt priority before Crop Top
        'tops:Crop Top',
        'bottoms:Jeans',
        'outerwear:Coat',
        'footwear:Sneakers',
        'headwear:Cap',
        'accessories:Ring',
        'other:Scarf',
      ]);

      const sortedDesc = service.sortGarments(garments, 'category', 'desc');
      expect(sortedDesc.map((g) => g.category)).toEqual([
        'other',
        'accessories',
        'headwear',
        'footwear',
        'outerwear',
        'bottoms',
        'tops',
        'tops',
      ]);
    });
  });
});
