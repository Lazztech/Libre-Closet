import {
  Body,
  Controller,
  HttpCode,
  Inject,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  Get,
  Query,
  Render,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { type Request, type Response } from 'express';
import { I18n, I18nContext } from 'nestjs-i18n';
import { ConditionalAuthGuard } from '../auth/conditional-auth.guard';
import { Payload } from '../auth/dto/payload.dto';
import { ScheduleService } from './schedule.service';

@UseGuards(ConditionalAuthGuard)
@Controller('schedule')
export class ScheduleController {
  private readonly logger = new Logger(ScheduleController.name);

  constructor(
    @Inject()
    private readonly scheduleService: ScheduleService,
  ) {}

  private userId(req: Request): number | undefined {
    return (req['user'] as Payload | undefined)?.userId;
  }

  @Get()
  @Render('schedule/index')
  async index(
    @Query('week') weekParam: string | undefined,
    @Query('calMonth') calMonthParam: string | undefined,
    @Req() req: Request,
    @I18n() i18n: I18nContext,
  ) {
    const anchor = parseWeekParam(weekParam);
    const [weekSchedule, outfits] = await Promise.all([
      this.scheduleService.findWeek(anchor, this.userId(req)),
      this.scheduleService.findOutfitsForUser(this.userId(req)),
    ]);

    const prevWeek = new Date(weekSchedule.weekStart);
    prevWeek.setUTCDate(prevWeek.getUTCDate() - 7);
    const nextWeek = new Date(weekSchedule.weekStart);
    nextWeek.setUTCDate(nextWeek.getUTCDate() + 7);
    const weekEndDate = new Date(weekSchedule.weekStart);
    weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 6);

    const todayStr = toWeekParam(new Date());
    const weekStartStr = toWeekParam(weekSchedule.weekStart);
    const weekEndStr = toWeekParam(weekEndDate);

    // ── Mini month calendar ──────────────────────────────────────────────
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

    // First visible Sunday for each adjacent month (Sunday on or before the 1st).
    // Exception: if today falls in that month, use today's week start instead.
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
    const prevMonthWeekParam = toWeekParam(
      prevMonthIsCurrent ? todayWeekStart : prevMonthFirst,
    );

    const nextMonthFirst = new Date(nextMonthDate);
    nextMonthFirst.setUTCDate(
      nextMonthFirst.getUTCDate() - nextMonthFirst.getUTCDay(),
    );
    const nextMonthIsCurrent =
      todayDate.getUTCFullYear() === nextMonthDate.getUTCFullYear() &&
      todayDate.getUTCMonth() === nextMonthDate.getUTCMonth();
    const nextMonthWeekParam = toWeekParam(
      nextMonthIsCurrent ? todayWeekStart : nextMonthFirst,
    );

    const calendarWeeks = buildCalendarWeeks(
      calYear,
      calMonth,
      todayStr,
      weekStartStr,
      weekEndStr,
    );

    // ── Day columns ──────────────────────────────────────────────────────
    const CHIP_HUES = [220, 240, 260];

    // Transform to plain objects — avoids MikroORM Ref/Collection proxy
    // edge cases inside Handlebars property-access lookups.
    const days = weekSchedule.days.map((day) => ({
      dayName: i18n.t(`lang.${DAY_I18N_KEYS[day.date.getUTCDay()]}`),
      dayNum: day.date.getUTCDate(),
      dateParam: toWeekParam(day.date),
      isToday: toWeekParam(day.date) === todayStr,
      entries: day.entries.map(({ entry, repeatWarnDays }, entryIndex) => {
        const outfit = entry.outfit.unwrap();
        const garmentPhotos = outfit.garments
          .getItems()
          .map((g) => g.photo?.fileName ?? null)
          .filter((f): f is string => f !== null);
        return {
          id: entry.id,
          wornAt: entry.wornAt ?? null,
          repeatWarnDays,
          outfit: {
            id: outfit.id,
            name: outfit.name || null,
            garmentPhotos,
            chipHue: CHIP_HUES[entryIndex % CHIP_HUES.length],
          },
        };
      }),
    }));

    return {
      pageTitle: 'Schedule',
      days,
      outfits: outfits.map((o) => ({ id: o.id, name: o.name })),
      weekParam: toWeekParam(weekSchedule.weekStart),
      weekLabel: formatWeekLabel(weekSchedule.weekStart, weekEndDate, i18n),
      prevWeekParam: toWeekParam(prevWeek),
      nextWeekParam: toWeekParam(nextWeek),
      today: todayStr,
      monthName: i18n.t(`lang.${MONTH_I18N_KEYS[calMonth]}`),
      year: calYear,
      calendarWeeks,
      prevMonthParam,
      nextMonthParam,
      prevMonthWeekParam,
      nextMonthWeekParam,
    };
  }

  @Post()
  async create(
    @Body()
    body: { date: string; outfitId: string; notes?: string; week?: string },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    await this.scheduleService.create(
      {
        date: new Date(body.date),
        outfitId: Number(body.outfitId),
        notes: body.notes,
      },
      this.userId(req),
    );
    return res.redirect(`/schedule?week=${body.week ?? body.date}`);
  }

  @Post(':id/delete')
  @HttpCode(200)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { week?: string },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    await this.scheduleService.remove(id, this.userId(req));
    res.setHeader('HX-Redirect', `/schedule?week=${body.week ?? ''}`);
    return res.send();
  }

  @Post(':id/worn')
  @HttpCode(303)
  async toggleWorn(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { week?: string },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    await this.scheduleService.toggleWorn(id, this.userId(req));
    return res.redirect(`/schedule?week=${body.week ?? ''}`);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** i18n key suffixes for each day of the week (index 0 = Sunday). */
const DAY_I18N_KEYS = [
  'SCHEDULE_DAY_SUN',
  'SCHEDULE_DAY_MON',
  'SCHEDULE_DAY_TUE',
  'SCHEDULE_DAY_WED',
  'SCHEDULE_DAY_THU',
  'SCHEDULE_DAY_FRI',
  'SCHEDULE_DAY_SAT',
] as const;

/** i18n key suffixes for each month (index 0 = January). */
const MONTH_I18N_KEYS = [
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

/** Parses a YYYY-MM-DD query param into a Date, defaulting to today. */
function parseWeekParam(param: string | undefined): Date {
  if (!param) return new Date();
  const d = new Date(param);
  return isNaN(d.getTime()) ? new Date() : d;
}

/** Formats a Date as YYYY-MM-DD for use in query params and hidden inputs. */
function toWeekParam(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Returns the CSS class for a single calendar date cell. */
function calCellClass(
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
function buildCalendarWeeks(
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
      const dateStr = toWeekParam(date);
      days.push({
        dayNum: date.getUTCDate(),
        calCellClass: calCellClass(
          dateStr,
          todayStr,
          weekStartStr,
          weekEndStr,
          date.getUTCMonth() === calMonth,
        ),
      });
      gridCursor.setUTCDate(gridCursor.getUTCDate() + 1);
    }
    weeks.push({ weekParam: toWeekParam(rowSunday), days });
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
function formatWeekLabel(start: Date, end: Date, i18n: I18nContext): string {
  const sm = i18n.t(`lang.${MONTH_I18N_KEYS[start.getUTCMonth()]}`);
  const em = i18n.t(`lang.${MONTH_I18N_KEYS[end.getUTCMonth()]}`);
  const year = end.getUTCFullYear();
  if (start.getUTCMonth() === end.getUTCMonth()) {
    return `${sm} ${start.getUTCDate()}\u2013${end.getUTCDate()}, ${year}`;
  }
  return `${sm} ${start.getUTCDate()} \u2013 ${em} ${end.getUTCDate()}, ${year}`;
}
