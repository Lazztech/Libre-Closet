import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { I18nContext } from 'nestjs-i18n';

jest.mock('../weather/weather.service', () => ({
  WeatherService: class MockWeatherService {
    getForecast = jest.fn().mockResolvedValue([]);
    getDayForecast = jest.fn().mockResolvedValue(null);
    getLocationLabel = jest.fn().mockResolvedValue(null);
  },
}));

import { CalendarService } from './calendar.service';
import { OutfitCalendar } from '../dal/entity/outfit-calendar.entity';
import { Outfit } from '../dal/entity/outfit.entity';
import { User } from '../dal/entity/user.entity';
import { WeatherService } from '../weather/weather.service';

describe('CalendarService', () => {
  let service: CalendarService;
  let mockCalendarRepo: any;
  let mockOutfitRepo: any;
  let mockUserRepo: any;
  let mockWeatherService: any;
  let mockI18n: I18nContext;
  let mockEm: any;

  beforeEach(async () => {
    mockEm = {
      persistAndFlush: jest.fn().mockResolvedValue(undefined),
      removeAndFlush: jest.fn().mockResolvedValue(undefined),
      flush: jest.fn().mockResolvedValue(undefined),
    };

    mockCalendarRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ ...dto })),
      getEntityManager: jest.fn(() => mockEm),
    };

    mockOutfitRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
    };

    mockUserRepo = {
      findOneOrFail: jest.fn().mockResolvedValue({ id: 1 }),
    };

    mockWeatherService = {
      getForecast: jest.fn().mockResolvedValue([]),
      getDayForecast: jest.fn().mockResolvedValue(null),
      getLocationLabel: jest.fn().mockResolvedValue(null),
    };

    mockI18n = {
      t: jest.fn((key: string) => key),
    } as unknown as I18nContext;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarService,
        {
          provide: getRepositoryToken(OutfitCalendar),
          useValue: mockCalendarRepo,
        },
        { provide: getRepositoryToken(Outfit), useValue: mockOutfitRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: WeatherService, useValue: mockWeatherService },
      ],
    }).compile();

    service = module.get<CalendarService>(CalendarService);
  });

  describe('findWeek', () => {
    it('returns a 7-day schedule starting on Sunday', async () => {
      const anchor = new Date('2026-11-04T00:00:00Z'); // Wednesday
      const schedule = await service.findWeek(anchor, 1);

      expect(schedule.days).toHaveLength(7);
      expect(schedule.weekStart.getUTCDay()).toBe(0); // Sunday
      expect(schedule.days[0].date.toISOString().slice(0, 10)).toBe(
        '2026-11-01',
      );
      expect(schedule.days[6].date.toISOString().slice(0, 10)).toBe(
        '2026-11-07',
      );
      expect(mockCalendarRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: { id: 1 },
        }),
        expect.anything(),
      );
    });
  });

  describe('findMonth', () => {
    it('calculates grid boundaries from Sunday to Saturday enclosing the full month', async () => {
      // November 2026: Nov 1 is Sunday, Nov 30 is Monday.
      // Grid starts Sun Nov 1, ends Sun Dec 6 (encloses Sat Dec 5).
      const result = await service.findMonth(2026, 10, 1); // 10 = Nov

      expect(result.gridStart.getUTCDay()).toBe(0); // Sunday
      expect(result.gridEnd.getUTCDay()).toBe(0); // Ends on next Sunday midnight (covering Saturday)
      expect(result.gridStart.toISOString().slice(0, 10)).toBe('2026-11-01');
      expect(result.gridEnd.toISOString().slice(0, 10)).toBe('2026-12-06');
      expect(mockCalendarRepo.find).toHaveBeenCalled();
    });

    it('handles months that start mid-week properly', async () => {
      // July 2026: July 1 is Wednesday.
      // Grid start is Sunday June 28, 2026.
      const result = await service.findMonth(2026, 6, 2); // 6 = July
      expect(result.gridStart.getUTCDay()).toBe(0); // Sunday
      expect(result.gridStart.toISOString().slice(0, 10)).toBe('2026-06-28');
    });
  });

  describe('buildIndexViewModel - Week View', () => {
    it('returns week view model with navigation and heading', async () => {
      const vm = await service.buildIndexViewModel(
        'week',
        undefined,
        '2026-11-04',
        undefined,
        undefined,
        1,
        mockI18n,
      );

      expect(vm.view).toBe('week');
      expect(vm.days).toHaveLength(7);
      expect(vm.weekDayNames).toHaveLength(7);
      expect(vm.periodHeading).toBeDefined();
      expect(vm.prevNavUrl).toContain('view=week');
      expect(vm.nextNavUrl).toContain('view=week');
      expect(vm.todayNavUrl).toContain('view=week');
      expect(vm.weekViewUrl).toContain('view=week');
      expect(vm.monthViewUrl).toContain('view=month');
      expect(vm.jumpDateValue).toBe('2026-11-04');
    });
  });

  describe('buildIndexViewModel - Month View', () => {
    it('returns month view model with complete days grid for the month', async () => {
      const vm = await service.buildIndexViewModel(
        'month',
        undefined,
        undefined,
        '2026-11',
        undefined,
        1,
        mockI18n,
      );

      expect(vm.view).toBe('month');
      expect(vm.monthDays.length).toBeGreaterThanOrEqual(28);
      expect(vm.monthDays.length % 7).toBe(0); // Full weeks
      expect(vm.periodHeading).toBe('lang.MONTH_NOV 2026');
      expect(vm.prevNavUrl).toContain('month=2026-10');
      expect(vm.nextNavUrl).toContain('month=2026-12');
      expect(vm.weekViewUrl).toContain('view=week');
      expect(vm.monthViewUrl).toContain('view=month');
    });

    it('marks inMonth flag correctly on days outside the primary month', async () => {
      // July 2026 starts June 28
      const vm = await service.buildIndexViewModel(
        'month',
        undefined,
        undefined,
        '2026-07',
        undefined,
        1,
        mockI18n,
      );

      const firstDay = vm.monthDays[0];
      expect(firstDay.dateParam).toBe('2026-06-28');
      expect(firstDay.inMonth).toBe(false);

      const julyFirst = vm.monthDays.find(
        (d: any) => d.dateParam === '2026-07-01',
      );
      expect(julyFirst).toBeDefined();
      expect(julyFirst.inMonth).toBe(true);
    });
  });

  describe('buildIndexViewModel - Jump to Date', () => {
    it('sets focal date and jumpDateValue when exact dateParam is provided', async () => {
      const vm = await service.buildIndexViewModel(
        'week',
        '2021-04-15',
        undefined,
        undefined,
        undefined,
        1,
        mockI18n,
      );

      expect(vm.jumpDateValue).toBe('2021-04-15');
      // Week containing 2021-04-15 starts on 2021-04-11
      expect(vm.days[0].dateParam).toBe('2021-04-11');
      expect(vm.days[4].dateParam).toBe('2021-04-15');
    });

    it('sets month and jumpDateValue when jumping to date in month view', async () => {
      const vm = await service.buildIndexViewModel(
        'month',
        '2021-04-15',
        undefined,
        undefined,
        undefined,
        1,
        mockI18n,
      );

      expect(vm.view).toBe('month');
      expect(vm.calYear).toBe(2021);
      expect(vm.calMonth).toBe(3); // April is 0-indexed 3
      expect(vm.jumpDateValue).toBe('2021-04-15');
      expect(vm.periodHeading).toBe('lang.MONTH_APR 2021');
    });
  });

  describe('toggleWorn and remove', () => {
    it('toggles worn status between set and undefined', async () => {
      const mockEntry: any = {
        id: 5,
        wornAt: undefined,
        owner: null,
      };
      mockCalendarRepo.findOne.mockResolvedValue(mockEntry);

      const res1 = await service.toggleWorn(5, undefined);
      expect(res1.wornAt).toBeDefined();

      const res2 = await service.toggleWorn(5, undefined);
      expect(res2.wornAt).toBeUndefined();
    });

    it('removes an owned entry', async () => {
      const mockEntry: any = { id: 7, owner: { id: 2 } };
      mockCalendarRepo.findOne.mockResolvedValue(mockEntry);

      await service.remove(7, 2);
      expect(mockEm.removeAndFlush).toHaveBeenCalledWith(mockEntry);
    });
  });
});
