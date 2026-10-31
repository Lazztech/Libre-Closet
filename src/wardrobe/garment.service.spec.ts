import { getRepositoryToken } from '@mikro-orm/nestjs';
import { Test, TestingModule } from '@nestjs/testing';
import { Garment } from '../dal/entity/garment.entity';
import { User } from '../dal/entity/user.entity';
import { OutfitCalendar } from '../dal/entity/outfit-calendar.entity';
import { FileService } from '../file/file-service.abstract';
import { WardrobeShareService } from '../wardrobe-share/wardrobe-share.service';
import { GarmentService } from './garment.service';
import { SEASONS, OCCASIONS, COLORS, LOOKUPS } from './additional-properties';

describe('GarmentService with Properties', () => {
  let service: GarmentService;
  let garmentRepo: any;
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

  it('supports subcategory on new categories such as headwear, innerwear', async () => {
    const hat = await service.create(
      {
        name: 'Grey Hat',
        category: 'headwear',
        subCategory: 'Hat',
      },
      1,
    );
    expect(hat.subCategory).toBe('Hat');

    const inner = await service.create(
      {
        name: 'Tank Top',
        category: 'innerwear',
        subCategory: 'Undertops',
      },
      1,
    );
    expect(inner.subCategory).toBe('Undertops');
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

  it('exposes accurate properties lookup dictionaries', () => {
    expect(SEASONS.length).toBe(5);
    expect(OCCASIONS.length).toBe(11);
    expect(COLORS.length).toBe(24);

    expect(LOOKUPS.seasonsById.get(3)).toBe('Spring');
    expect(LOOKUPS.seasonsByName.get('spring')).toBe(3);
  });
});
