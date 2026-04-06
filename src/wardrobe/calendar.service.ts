import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OutfitCalendar } from '../dal/entity/outfit-calendar.entity';
import { Outfit } from '../dal/entity/outfit.entity';
import { User } from '../dal/entity/user.entity';
import { CreateCalendarEntryDto } from './dto/create-calendar-entry.dto';
import { CalendarDay } from './view-models/calendar-day.view-model';
import { WeekSchedule } from './view-models/week-schedule.view-model';
import { I18nContext } from 'nestjs-i18n';
import { WeekNavBoundaries } from './view-models/week-nav-boundaries';

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  /** i18n key suffixes for each month (index 0 = January). */
  private readonly MONTH_I18N_KEYS = [
    'MONTH_JAN',
    'MONTH_FEB',
    'MONTH_MAR',
    'MONTH_APR',
    'MONTH_MAY',
    'MONTH_JUN',
    'MONTH_JUL',
    'MONTH_AUG',
    'MONTH_SEP',
    'MONTH_OCT',
    'MONTH_NOV',
    'MONTH_DEC',
  ] as const;

  /** i18n key suffixes for each day of the week (index 0 = Sunday). */
  private readonly DAY_I18N_KEYS = [
    'CALENDAR_DAY_SUN',
    'CALENDAR_DAY_MON',
    'CALENDAR_DAY_TUE',
    'CALENDAR_DAY_WED',
    'CALENDAR_DAY_THU',
    'CALENDAR_DAY_FRI',
    'CALENDAR_DAY_SAT',
  ] as const;

  constructor(
    @InjectRepository(OutfitCalendar)
    private readonly calendarRepository: EntityRepository<OutfitCalendar>,
    @InjectRepository(Outfit)
    private readonly outfitRepository: EntityRepository<Outfit>,
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
  ) {}

  /**
   * Returns a WeekSchedule for the 7-day window starting on the Sunday
   * that contains `anchorDate`.  Populates outfit + garment thumbnails and
   * annotates each entry with a repeat-wear warning when applicable.
   */
  async findWeek(anchorDate: Date, userId?: number): Promise<WeekSchedule> {
    const weekStart = startOfWeek(anchorDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const ownerFilter =
      userId != null ? { owner: { id: userId } } : { owner: null };

    const entries = await this.calendarRepository.find(
      { ...ownerFilter, date: { $gte: weekStart, $lt: weekEnd } },
      { populate: ['outfit', 'outfit.garments', 'outfit.garments.photo'] },
    );

    const days: CalendarDay[] = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      return { date, entries: [] };
    });

    for (const entry of entries) {
      const dayIndex = daysBetween(weekStart, entry.date);
      if (dayIndex < 0 || dayIndex > 6) continue;

      days[dayIndex].entries.push(entry);
    }

    return { weekStart, days };
  }

  async create(
    dto: CreateCalendarEntryDto,
    userId?: number,
  ): Promise<OutfitCalendar> {
    const outfit = await this.outfitRepository.findOne(
      userId != null
        ? { id: dto.outfitId, owner: { id: userId } }
        : { id: dto.outfitId, owner: null },
    );
    if (!outfit) throw new NotFoundException('Outfit not found');

    const entry = this.calendarRepository.create({
      date: dto.date,
      outfit,
      notes: dto.notes,
    });

    if (userId != null) {
      const user = await this.userRepository.findOneOrFail(userId);
      entry.owner = user as any;
    }

    await this.calendarRepository.getEntityManager().persistAndFlush(entry);
    this.logger.log(
      `Calendar entry created: outfitId=${dto.outfitId} date=${dto.date.toISOString()} userId=${userId}`,
    );
    return entry;
  }

  async remove(id: number, userId?: number): Promise<void> {
    const entry = await this.findOneOwned(id, userId);
    await this.calendarRepository.getEntityManager().removeAndFlush(entry);
  }

  /**
   * Toggles the wornAt field.  If wornAt is null, sets it to today.
   * If already set, clears it (unmark worn).
   */
  async toggleWorn(id: number, userId?: number): Promise<OutfitCalendar> {
    const entry = await this.findOneOwned(id, userId);
    entry.wornAt = entry.wornAt == null ? new Date() : undefined;
    await this.calendarRepository.getEntityManager().flush();
    return entry;
  }

  /** Returns outfits the user may add to the calendar (respects auth scoping). */
  async findOutfitsForUser(userId?: number): Promise<Outfit[]> {
    if (userId != null) {
      return this.outfitRepository.find(
        { owner: { id: userId } },
        { populate: ['garments', 'garments.photo'] },
      );
    }
    return this.outfitRepository.find(
      { owner: null },
      { populate: ['garments', 'garments.photo'] },
    );
  }

  /**
   * Assembles the full view-model for the calendar index page.
   * Encapsulates all date math, month-navigation, and entry transformation
   * so the controller only handles the HTTP layer.
   */
  async buildIndexViewModel(
    weekParam: string | undefined,
    calMonthParam: string | undefined,
    userId: number | undefined,
    i18n: I18nContext,
  ) {
    const anchor = this.parseWeekParam(weekParam);
    const [weekSchedule, outfits] = await Promise.all([
      this.findWeek(anchor, userId),
      this.findOutfitsForUser(userId),
    ]);

    const weekBounds = this.findWeekBounds(weekSchedule);

    const miniMonthCal = this.getMiniMonthCal(
      weekBounds,
      weekSchedule,
      calMonthParam,
    );

    const {
      calYear,
      calMonth,
      calendarWeeks,
      prevMonthParam,
      nextMonthParam,
      prevMonthWeekParam,
      nextMonthWeekParam,
    } = miniMonthCal;

    const days = this.calDays(weekSchedule, i18n, weekBounds);

    return {
      pageTitle: i18n.t('lang.CALENDAR_PAGE_TITLE'),
      days,
      outfits: outfits.map((o) => ({ id: o.id, name: o.name })),
      weekParam: this.toWeekParam(weekSchedule.weekStart),
      weekLabel: this.formatWeekLabel(
        weekSchedule.weekStart,
        weekBounds.weekEndDate,
        i18n,
      ),
      prevWeekParam: this.toWeekParam(weekBounds.prevWeek),
      nextWeekParam: this.toWeekParam(weekBounds.nextWeek),
      today: weekBounds.todayStr,
      monthName: i18n.t(`lang.${this.MONTH_I18N_KEYS[calMonth]}`),
      year: calYear,
      calendarWeeks,
      prevMonthParam,
      nextMonthParam,
      prevMonthWeekParam,
      nextMonthWeekParam,
    };
  }
  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------
  /** Parses a YYYY-MM-DD query param into a Date, defaulting to today. */
  private parseWeekParam(param: string | undefined): Date {
    if (!param) return new Date();
    const d = new Date(param);
    return isNaN(d.getTime()) ? new Date() : d;
  }

  /** Formats a Date as YYYY-MM-DD for use in query params and hidden inputs. */
  private toWeekParam(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  /** Returns the CSS class for a single calendar date cell. */
  private calCellClass(
    dateStr: string,
    todayStr: string,
    weekStartStr: string,
    weekEndStr: string,
    inMonth: boolean,
  ): string {
    if (dateStr === todayStr) return 'cal-today';
    if (dateStr >= weekStartStr && dateStr <= weekEndStr) return 'cal-in-week';
    if (!inMonth) return 'cal-out-month';
    return '';
  }

  /** Builds the mini-calendar grid rows for the given month. */
  private buildCalendarWeeks(
    calYear: number,
    calMonth: number,
    todayStr: string,
    weekStartStr: string,
    weekEndStr: string,
  ): { weekParam: string; days: { dayNum: number; calCellClass: string }[] }[] {
    const monthFirstDay = new Date(Date.UTC(calYear, calMonth, 1));
    const gridCursor = new Date(monthFirstDay);
    gridCursor.setUTCDate(gridCursor.getUTCDate() - gridCursor.getUTCDay());
    const weeks: {
      weekParam: string;
      days: { dayNum: number; calCellClass: string }[];
    }[] = [];
    for (let w = 0; w < 6; w++) {
      const rowSunday = new Date(gridCursor);
      const days: { dayNum: number; calCellClass: string }[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(gridCursor);
        const dateStr = this.toWeekParam(date);
        days.push({
          dayNum: date.getUTCDate(),
          calCellClass: this.calCellClass(
            dateStr,
            todayStr,
            weekStartStr,
            weekEndStr,
            date.getUTCMonth() === calMonth,
          ),
        });
        gridCursor.setUTCDate(gridCursor.getUTCDate() + 1);
      }
      weeks.push({ weekParam: this.toWeekParam(rowSunday), days });
      if (gridCursor.getUTCMonth() !== calMonth && gridCursor.getUTCDay() === 0)
        break;
    }
    return weeks;
  }

  /**
   * Returns a human-readable week range label, e.g.
   *   "Mar 25–31, 2026"  (same month)
   *   "Mar 29 – Apr 4, 2026"  (spans two months)
   */
  private formatWeekLabel(start: Date, end: Date, i18n: I18nContext): string {
    const sm = i18n.t(`lang.${this.MONTH_I18N_KEYS[start.getUTCMonth()]}`);
    const em = i18n.t(`lang.${this.MONTH_I18N_KEYS[end.getUTCMonth()]}`);
    const year = end.getUTCFullYear();
    if (start.getUTCMonth() === end.getUTCMonth()) {
      return `${sm} ${start.getUTCDate()}\u2013${end.getUTCDate()}, ${year}`;
    }
    return `${sm} ${start.getUTCDate()} \u2013 ${em} ${end.getUTCDate()}, ${year}`;
  }

  /** Builds the day columns for the week view. */
  private calDays(
    weekSchedule: WeekSchedule,
    i18n: I18nContext,
    weekBounds: WeekNavBoundaries,
  ) {
    const CHIP_HUES = [220, 240, 260];

    const days = weekSchedule.days.map((day) => ({
      dayName: i18n.t(`lang.${this.DAY_I18N_KEYS[day.date.getUTCDay()]}`),
      dayNum: day.date.getUTCDate(),
      dateParam: this.toWeekParam(day.date),
      isToday: this.toWeekParam(day.date) === weekBounds.todayStr,
      entries: day.entries.map((entry, entryIndex) => {
        const outfit = entry.outfit.unwrap();
        const garmentPhotos = outfit.garments
          .getItems()
          .map((g) => g.photo?.fileName ?? null)
          .filter((f): f is string => f !== null);
        return {
          id: entry.id,
          wornAt: entry.wornAt ?? null,
          outfit: {
            id: outfit.id,
            name: outfit.name || null,
            garmentPhotos,
            chipHue: CHIP_HUES[entryIndex % CHIP_HUES.length],
          },
        };
      }),
    }));
    return days;
  }

  /** Builds the mini-month calendar for the given week and month. */
  private getMiniMonthCal(
    weekBounds: WeekNavBoundaries,
    weekSchedule: WeekSchedule,
    calMonthParam: string | undefined,
  ) {
    let calMonth = weekSchedule.weekStart.getUTCMonth();
    let calYear = weekSchedule.weekStart.getUTCFullYear();
    if (calMonthParam && /^\d{4}-\d{2}$/.test(calMonthParam)) {
      const [y, m] = calMonthParam.split('-').map(Number);
      calYear = y;
      calMonth = m - 1;
    }
    const prevMonthDate = new Date(Date.UTC(calYear, calMonth - 1, 1));
    const nextMonthDate = new Date(Date.UTC(calYear, calMonth + 1, 1));
    const prevMonthParam = `${prevMonthDate.getUTCFullYear()}-${String(prevMonthDate.getUTCMonth() + 1).padStart(2, '0')}`;
    const nextMonthParam = `${nextMonthDate.getUTCFullYear()}-${String(nextMonthDate.getUTCMonth() + 1).padStart(2, '0')}`;

    const todayDate = new Date();
    const todayWeekStart = new Date(
      Date.UTC(
        todayDate.getUTCFullYear(),
        todayDate.getUTCMonth(),
        todayDate.getUTCDate(),
      ),
    );
    todayWeekStart.setUTCDate(
      todayWeekStart.getUTCDate() - todayWeekStart.getUTCDay(),
    );

    const prevMonthFirst = new Date(prevMonthDate);
    prevMonthFirst.setUTCDate(
      prevMonthFirst.getUTCDate() - prevMonthFirst.getUTCDay(),
    );
    const prevMonthIsCurrent =
      todayDate.getUTCFullYear() === prevMonthDate.getUTCFullYear() &&
      todayDate.getUTCMonth() === prevMonthDate.getUTCMonth();
    const prevMonthWeekParam = this.toWeekParam(
      prevMonthIsCurrent ? todayWeekStart : prevMonthFirst,
    );

    const nextMonthFirst = new Date(nextMonthDate);
    nextMonthFirst.setUTCDate(
      nextMonthFirst.getUTCDate() - nextMonthFirst.getUTCDay(),
    );
    const nextMonthIsCurrent =
      todayDate.getUTCFullYear() === nextMonthDate.getUTCFullYear() &&
      todayDate.getUTCMonth() === nextMonthDate.getUTCMonth();
    const nextMonthWeekParam = this.toWeekParam(
      nextMonthIsCurrent ? todayWeekStart : nextMonthFirst,
    );

    const calendarWeeks = this.buildCalendarWeeks(
      calYear,
      calMonth,
      weekBounds.todayStr,
      weekBounds.weekStartStr,
      weekBounds.weekEndStr,
    );

    return {
      calMonth,
      calYear,
      calendarWeeks,
      prevMonthParam,
      nextMonthParam,
      prevMonthWeekParam,
      nextMonthWeekParam,
    };
  }

  private findWeekBounds(weekSchedule: WeekSchedule) {
    const prevWeek = new Date(weekSchedule.weekStart);
    prevWeek.setUTCDate(prevWeek.getUTCDate() - 7);
    const nextWeek = new Date(weekSchedule.weekStart);
    nextWeek.setUTCDate(nextWeek.getUTCDate() + 7);
    const weekEndDate = new Date(weekSchedule.weekStart);
    weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 6);

    const todayStr = this.toWeekParam(new Date());
    const weekStartStr = this.toWeekParam(weekSchedule.weekStart);
    const weekEndStr = this.toWeekParam(weekEndDate);
    return {
      prevWeek,
      nextWeek,
      weekEndDate,
      todayStr,
      weekStartStr,
      weekEndStr,
    };
  }

  private async findOneOwned(
    id: number,
    userId?: number,
  ): Promise<OutfitCalendar> {
    const entry = await this.calendarRepository.findOne(id, {
      populate: ['outfit'],
    });
    if (!entry) throw new NotFoundException('Calendar entry not found');

    if (userId != null) {
      if (entry.owner?.id !== userId) throw new ForbiddenException();
    } else {
      if (entry.owner != null) throw new ForbiddenException();
    }
    return entry;
  }
}

// ---------------------------------------------------------------------------
// Pure date helpers (no external deps)
// ---------------------------------------------------------------------------

/** Returns the Sunday of the week containing `d` at midnight UTC. */
function startOfWeek(d: Date): Date {
  const result = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  result.setUTCDate(result.getUTCDate() - result.getUTCDay());
  return result;
}

/** Number of whole days from `from` to `to` (positive when to > from). */
function daysBetween(from: Date, to: Date): number {
  return Math.round(
    (Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()) -
      Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())) /
      86_400_000,
  );
}
