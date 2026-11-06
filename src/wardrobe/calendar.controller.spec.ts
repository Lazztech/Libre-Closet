import { Test, TestingModule } from '@nestjs/testing';
import { I18nContext } from 'nestjs-i18n';

jest.mock('../weather/weather.service', () => ({
  WeatherService: class MockWeatherService {
    getForecast = jest.fn().mockResolvedValue([]);
    getDayForecast = jest.fn().mockResolvedValue(null);
    getLocationLabel = jest.fn().mockResolvedValue(null);
  },
}));

import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { ConditionalAuthGuard } from '../auth/conditional-auth.guard';

describe('CalendarController', () => {
  let controller: CalendarController;
  let mockCalendarService: any;
  let mockI18n: I18nContext;
  let mockReply: any;

  beforeEach(async () => {
    mockCalendarService = {
      buildIndexViewModel: jest
        .fn()
        .mockResolvedValue({ pageTitle: 'Outfit Calendar' }),
      buildWeatherModalViewModel: jest
        .fn()
        .mockResolvedValue({ forecast: null }),
      create: jest.fn().mockResolvedValue({ id: 10 }),
      remove: jest.fn().mockResolvedValue(undefined),
      toggleWorn: jest.fn().mockResolvedValue({ id: 10, wornAt: new Date() }),
    };

    mockI18n = {
      t: jest.fn((key: string) => key),
    } as unknown as I18nContext;

    mockReply = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      redirect: jest.fn().mockReturnThis(),
      header: jest.fn().mockReturnThis(),
      viewPartial: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CalendarController],
      providers: [{ provide: CalendarService, useValue: mockCalendarService }],
    })
      .overrideGuard(ConditionalAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CalendarController>(CalendarController);
  });

  describe('index', () => {
    it('passes view, date, week, month params to buildIndexViewModel', async () => {
      const mockReq: any = {
        headers: {},
      };

      await controller.index(
        'month',
        '2024-05-18',
        undefined,
        '2024-05',
        undefined,
        undefined,
        undefined,
        mockReq,
        mockI18n,
      );

      expect(mockCalendarService.buildIndexViewModel).toHaveBeenCalledWith(
        'month',
        '2024-05-18',
        undefined,
        '2024-05',
        undefined,
        undefined,
        mockI18n,
        undefined,
        undefined,
        'celsius',
      );
    });
  });

  describe('create', () => {
    it('redirects to month view when view is month', async () => {
      const mockReq: any = { headers: {} };
      await controller.create(
        {
          date: '2024-05-18',
          outfitId: '5',
          view: 'month',
          month: '2024-05',
        },
        mockReq,
        mockReply,
      );

      expect(mockCalendarService.create).toHaveBeenCalled();
      expect(mockReply.redirect).toHaveBeenCalledWith(
        '/calendar?view=month&month=2024-05',
        302,
      );
    });

    it('redirects to week view when view is week or default', async () => {
      const mockReq: any = { headers: {} };
      await controller.create(
        {
          date: '2024-05-18',
          outfitId: '5',
          week: '2024-05-18',
        },
        mockReq,
        mockReply,
      );

      expect(mockReply.redirect).toHaveBeenCalledWith(
        '/calendar?view=week&week=2024-05-18',
        302,
      );
    });
  });

  describe('remove', () => {
    it('sets HX-Redirect header to month view when view is month', async () => {
      const mockReq: any = { headers: {} };
      await controller.remove(
        10,
        { view: 'month', month: '2024-05' },
        mockReq,
        mockReply,
      );

      expect(mockCalendarService.remove).toHaveBeenCalledWith(10, undefined);
      expect(mockReply.header).toHaveBeenCalledWith(
        'HX-Redirect',
        '/calendar?view=month&month=2024-05',
      );
      expect(mockReply.send).toHaveBeenCalled();
    });
  });

  describe('toggleWorn', () => {
    it('returns month partial when request is from month view with hx-request', async () => {
      const mockReq: any = {
        headers: { 'hx-request': 'true' },
      };
      await controller.toggleWorn(
        10,
        { view: 'month', month: '2024-05' },
        mockReq,
        mockReply,
        mockI18n,
      );

      expect(mockCalendarService.toggleWorn).toHaveBeenCalledWith(
        10,
        undefined,
      );
      expect(mockReply.viewPartial).toHaveBeenCalledWith(
        'partials/calendar_worn_button_month',
        expect.objectContaining({
          entryId: 10,
          month: '2024-05',
          isWorn: true,
        }),
      );
    });

    it('returns week partial when request is from week view with hx-request', async () => {
      const mockReq: any = {
        headers: { 'hx-request': 'true' },
      };
      await controller.toggleWorn(
        10,
        { week: '2024-05-18' },
        mockReq,
        mockReply,
        mockI18n,
      );

      expect(mockReply.viewPartial).toHaveBeenCalledWith(
        'partials/calendar_worn_button',
        expect.objectContaining({
          entryId: 10,
          week: '2024-05-18',
        }),
      );
    });
  });
});
