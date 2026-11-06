import { Test, TestingModule } from '@nestjs/testing';
import { WardrobeController } from './wardrobe.controller';
import { GarmentService } from './garment.service';
import { WardrobeShareService } from '../wardrobe-share/wardrobe-share.service';
import { ConditionalAuthGuard } from '../auth/conditional-auth.guard';

describe('WardrobeController - garmentOutfits', () => {
  let controller: WardrobeController;
  let mockGarmentService: any;
  let mockShareService: any;

  beforeEach(async () => {
    mockGarmentService = {
      findGarmentOutfitsWithWearHistory: jest.fn().mockResolvedValue({
        garment: { id: 10, name: 'Linen Shirt' },
        outfits: [
          {
            id: 1,
            name: 'Summer Look',
            isWorn: true,
            wornDates: [
              { date: new Date('2026-06-01'), dateStr: '2026-06-01' },
            ],
          },
        ],
      }),
    };
    mockShareService = {};

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WardrobeController],
      providers: [
        { provide: GarmentService, useValue: mockGarmentService },
        { provide: WardrobeShareService, useValue: mockShareService },
      ],
    })
      .overrideGuard(ConditionalAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<WardrobeController>(WardrobeController);
  });

  it('renders wardrobe/outfits with outfits in descending creation order by default', async () => {
    const mockReq: any = { user: { userId: 5 } };
    const result = await controller.garmentOutfits(
      10,
      mockReq,
      undefined,
      undefined,
    );

    expect(
      mockGarmentService.findGarmentOutfitsWithWearHistory,
    ).toHaveBeenCalledWith(10, 5, undefined, 'desc');
    expect(result).toEqual({
      garment: { id: 10, name: 'Linen Shirt' },
      outfits: [
        {
          id: 1,
          name: 'Summer Look',
          isWorn: true,
          wornDates: [{ date: new Date('2026-06-01'), dateStr: '2026-06-01' }],
        },
      ],
      sort: 'desc',
      viewOwner: null,
    });
  });

  it('passes asc sort and viewOwner when provided', async () => {
    const mockReq: any = { user: { userId: 5 } };
    const result = await controller.garmentOutfits(10, mockReq, 'asc', '20');

    expect(
      mockGarmentService.findGarmentOutfitsWithWearHistory,
    ).toHaveBeenCalledWith(10, 5, 20, 'asc');
    expect(result.sort).toBe('asc');
    expect(result.viewOwner).toBe(20);
  });

  it('updates garment joining multi-select looks into comma-separated string', async () => {
    mockGarmentService.update = jest.fn().mockResolvedValue({});
    const mockReq: any = { user: { userId: 5 } };
    const mockReply: any = { redirect: jest.fn() };

    await controller.update(
      10,
      {
        name: 'Classic Shirt',
        looks: ['Casual', 'Vintage'],
      },
      mockReq,
      mockReply,
      undefined,
    );

    expect(mockGarmentService.update).toHaveBeenCalledWith(
      10,
      expect.objectContaining({
        name: 'Classic Shirt',
        looks: 'Casual,Vintage',
      }),
      5,
      5,
    );
    expect(mockReply.redirect).toHaveBeenCalledWith('/wardrobe/10', 302);
  });
});
