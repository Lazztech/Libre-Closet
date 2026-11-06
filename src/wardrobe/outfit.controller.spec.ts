import { Test, TestingModule } from '@nestjs/testing';
import { I18nContext } from 'nestjs-i18n';

jest.mock('../weather/weather.service', () => ({
  WeatherService: class MockWeatherService {
    getForecast = jest.fn().mockResolvedValue([]);
    getDayForecast = jest.fn().mockResolvedValue(null);
    getLocationLabel = jest.fn().mockResolvedValue(null);
  },
}));

import { OutfitController } from './outfit.controller';
import { OutfitService } from './outfit.service';
import { GarmentService } from './garment.service';
import { CalendarService } from './calendar.service';
import { ConditionalAuthGuard } from '../auth/conditional-auth.guard';

describe('OutfitController', () => {
  let controller: OutfitController;
  let mockOutfitService: any;
  let mockGarmentService: any;
  let mockCalendarService: any;
  let mockI18n: I18nContext;
  let mockReply: any;

  beforeEach(async () => {
    mockOutfitService = {
      findAll: jest.fn().mockResolvedValue([]),
      findPaginated: jest.fn().mockResolvedValue({
        outfits: [{ id: 1, name: 'Outfit 1' }],
        total: 100,
        hasMore: true,
      }),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      parseSlotsFromBody: jest.fn().mockReturnValue([]),
      buildCategoryRows: jest.fn().mockReturnValue([]),
      buildRow: jest.fn(),
      getOrderedGarments: jest.fn((outfit) =>
        outfit?.garments?.getItems ? outfit.garments.getItems() : [],
      ),
    };

    mockGarmentService = {
      findAll: jest
        .fn()
        .mockResolvedValue([
          { id: 10, name: 'T-Shirt', category: 'tops', subCategory: 'T-shirt' },
        ]),
      findAvailableFilters: jest.fn().mockResolvedValue({
        brands: ['Nike'],
        sizes: ['M', 'L'],
        categories: ['tops'],
        subCategories: ['T-shirt', 'Polo'],
      }),
      resolveCategoryLabel: jest.fn((cat: string) => cat.toUpperCase()),
    };

    mockCalendarService = {
      create: jest.fn(),
    };

    mockI18n = {
      t: jest.fn((key: string) => key),
    } as unknown as I18nContext;

    mockReply = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      redirect: jest.fn().mockReturnThis(),
      header: jest.fn().mockReturnThis(),
      view: jest.fn().mockReturnThis(),
      viewPartial: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OutfitController],
      providers: [
        { provide: OutfitService, useValue: mockOutfitService },
        { provide: GarmentService, useValue: mockGarmentService },
        { provide: CalendarService, useValue: mockCalendarService },
      ],
    })
      .overrideGuard(ConditionalAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OutfitController>(OutfitController);
  });

  describe('index', () => {
    it('renders outfits/index with first 50 outfits and pagination metadata', async () => {
      const mockReq: any = { user: { userId: 5 } };
      await controller.index(mockReq, mockReply);

      expect(mockOutfitService.findPaginated).toHaveBeenCalledWith(5, 50, 0);
      expect(mockReply.view).toHaveBeenCalledWith('outfits/index', {
        outfits: [{ id: 1, name: 'Outfit 1' }],
        total: 100,
        hasMore: true,
        nextOffset: 1,
        limit: 50,
      });
    });

    it('renders partials/outfit_cards_batch when batch=true', async () => {
      const mockReq: any = { user: { userId: 5 } };
      await controller.index(mockReq, mockReply, '50', '50', 'true');

      expect(mockOutfitService.findPaginated).toHaveBeenCalledWith(5, 50, 50);
      expect(mockReply.viewPartial).toHaveBeenCalledWith(
        'partials/outfit_cards_batch',
        {
          outfits: [{ id: 1, name: 'Outfit 1' }],
          total: 100,
          hasMore: true,
          nextOffset: 51,
          limit: 50,
        },
      );
    });
  });

  describe('show', () => {
    it('calls getOrderedGarments and returns outfit with garments ordered by user preference', async () => {
      const mockReq: any = { user: { userId: 5 } };
      const dummyOutfit = {
        id: 7,
        name: 'Cool Outfit',
        garments: {
          getItems: () => [{ id: 10, name: 'Shirt' }],
        },
      };
      mockOutfitService.findOne.mockResolvedValueOnce(dummyOutfit);
      mockOutfitService.getOrderedGarments.mockReturnValueOnce([
        { id: 10, name: 'Shirt' },
      ]);

      const result = await controller.show(7, mockReq);

      expect(mockOutfitService.findOne).toHaveBeenCalledWith(7, 5);
      expect(mockOutfitService.getOrderedGarments).toHaveBeenCalledWith(
        dummyOutfit,
      );
      expect(result).toEqual({
        outfit: dummyOutfit,
        garments: [{ id: 10, name: 'Shirt' }],
        looksList: [],
        seasonsList: [],
        occasionsList: [],
      });
    });
  });

  describe('create and update with metadata', () => {
    it('creates an outfit parsing looks, occasions, and seasons arrays', async () => {
      const mockReq: any = { user: { userId: 5 } };
      mockOutfitService.create.mockResolvedValueOnce({ id: 99 });

      await controller.create(
        {
          name: 'Weekend Trip',
          notes: 'Sunny and breezy',
          rating: '4',
          looks: ['Casual', 'Classic'],
          occasions: ['Work', 'Everyday'],
          seasons: ['Spring', 'Summer'],
          category: ['tops'],
          garmentId: ['1'],
        },
        mockReq,
        mockReply,
      );

      expect(mockOutfitService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Weekend Trip',
          rating: 4,
          looks: 'Casual,Classic',
          occasions: 'Work,Everyday',
          seasons: 'Spring,Summer',
        }),
        5,
      );
      expect(mockReply.redirect).toHaveBeenCalledWith('/outfits/99', 302);
    });

    it('updates an outfit parsing looks array, occasions, and seasons', async () => {
      const mockReq: any = { user: { userId: 5 } };
      mockOutfitService.update.mockResolvedValueOnce({ id: 99 });

      await controller.update(
        99,
        {
          name: 'Weekend Trip Updated',
          looks: ['Formal', 'Business'],
          occasions: 'Date,Special',
          seasons: 'Autumn',
          category: ['tops'],
          garmentId: ['1'],
        },
        mockReq,
        mockReply,
      );

      expect(mockOutfitService.update).toHaveBeenCalledWith(
        99,
        expect.objectContaining({
          name: 'Weekend Trip Updated',
          looks: 'Formal,Business',
          occasions: 'Date,Special',
          seasons: 'Autumn',
        }),
        5,
      );
      expect(mockReply.redirect).toHaveBeenCalledWith('/outfits/99', 302);
    });
  });

  describe('pickerModal', () => {
    it('returns 400 when category is missing', async () => {
      const mockReq: any = { user: { userId: 5 } };
      await controller.pickerModal(
        { category: '' },
        mockReq,
        mockReply,
        mockI18n,
      );

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalled();
    });

    it('filters and sorts garments and renders partials/garment_picker_modal', async () => {
      const mockReq: any = { user: { userId: 5 } };
      await controller.pickerModal(
        {
          category: 'tops',
          rowId: 'row-tops-1',
          currentId: '10',
          subCategory: 'T-shirt',
          sortBy: 'name',
          sortOrder: 'asc',
        } as any,
        mockReq,
        mockReply,
        mockI18n,
      );

      expect(mockGarmentService.findAll).toHaveBeenCalledWith(5, {
        category: 'tops',
        rowId: 'row-tops-1',
        currentId: '10',
        subCategory: 'T-shirt',
        sortBy: 'name',
        sortOrder: 'asc',
      });
      expect(mockGarmentService.findAvailableFilters).toHaveBeenCalledWith(5);
      expect(mockReply.viewPartial).toHaveBeenCalledWith(
        'partials/garment_picker_modal',
        expect.objectContaining({
          category: 'tops',
          categoryLabel: 'TOPS',
          currentId: 10,
          rowId: 'row-tops-1',
          activeFilterCount: 1,
          activeSortLabel: expect.stringContaining('lang.NAME (A–Z)'),
        }),
      );
    });
  });
});
