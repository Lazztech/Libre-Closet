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
    @Req() req: Request,
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

    // Transform to plain objects — avoids MikroORM Ref/Collection proxy
    // edge cases inside Handlebars property-access lookups.
    const days = weekSchedule.days.map((day) => ({
      dayName: DAY_NAMES[day.date.getUTCDay()],
      dayNum: day.date.getUTCDate(),
      dateParam: toWeekParam(day.date),
      isToday: toWeekParam(day.date) === todayStr,
      entries: day.entries.map(({ entry, repeatWarnDays }) => {
        const outfit = entry.outfit.unwrap();
        return {
          id: entry.id,
          wornAt: entry.wornAt ?? null,
          repeatWarnDays,
          outfit: {
            id: outfit.id,
            name: outfit.name,
            garments: outfit.garments.getItems().map((g) => ({
              name: g.name,
              photo: g.photo ? { fileName: g.photo.fileName } : null,
            })),
          },
        };
      }),
    }));

    return {
      pageTitle: 'Schedule',
      days,
      outfits: outfits.map((o) => ({ id: o.id, name: o.name })),
      weekParam: toWeekParam(weekSchedule.weekStart),
      weekLabel: formatWeekLabel(weekSchedule.weekStart, weekEndDate),
      prevWeekParam: toWeekParam(prevWeek),
      nextWeekParam: toWeekParam(nextWeek),
      today: todayStr,
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
  @HttpCode(303)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { week?: string },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    await this.scheduleService.remove(id, this.userId(req));
    return res.redirect(`/schedule?week=${body.week ?? ''}`);
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

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
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

/**
 * Returns a human-readable week range label, e.g.
 *   "Mar 25–31, 2026"  (same month)
 *   "Mar 29 – Apr 4, 2026"  (spans two months)
 */
function formatWeekLabel(start: Date, end: Date): string {
  const sm = MONTH_NAMES[start.getUTCMonth()];
  const em = MONTH_NAMES[end.getUTCMonth()];
  const year = end.getUTCFullYear();
  if (start.getUTCMonth() === end.getUTCMonth()) {
    return `${sm} ${start.getUTCDate()}\u2013${end.getUTCDate()}, ${year}`;
  }
  return `${sm} ${start.getUTCDate()} \u2013 ${em} ${end.getUTCDate()}, ${year}`;
}
