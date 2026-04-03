import {
  Body,
  Controller,
  HttpCode,
  Inject,
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
import { CalendarService } from './calendar.service';

@UseGuards(ConditionalAuthGuard)
@Controller('calendar')
export class CalendarController {
  constructor(
    @Inject()
    private readonly calendarService: CalendarService,
  ) {}

  private userId(req: Request): number | undefined {
    return (req['user'] as Payload | undefined)?.userId;
  }

  @Get()
  @Render('calendar/index')
  async index(
    @Query('week') weekParam: string | undefined,
    @Query('calMonth') calMonthParam: string | undefined,
    @Req() req: Request,
    @I18n() i18n: I18nContext,
  ) {
    return this.calendarService.buildIndexViewModel(
      weekParam,
      calMonthParam,
      this.userId(req),
      i18n,
    );
  }

  @Post()
  async create(
    @Body()
    body: { date: string; outfitId: string; notes?: string; week?: string },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    await this.calendarService.create(
      {
        date: new Date(body.date),
        outfitId: Number(body.outfitId),
        notes: body.notes,
      },
      this.userId(req),
    );
    return res.redirect(`/calendar?week=${body.week ?? body.date}`);
  }

  @Post(':id/delete')
  @HttpCode(200)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { week?: string },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    await this.calendarService.remove(id, this.userId(req));
    res.setHeader('HX-Redirect', `/calendar?week=${body.week ?? ''}`);
    return res.send();
  }

  @Post(':id/worn')
  async toggleWorn(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { week?: string },
    @Req() req: Request,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    const entry = await this.calendarService.toggleWorn(id, this.userId(req));
    const week = body.week ?? '';

    if (req.headers['hx-request']) {
      const isWorn = !!entry.wornAt;
      const btnClass = isWorn
        ? 'bg-success text-success-content'
        : 'text-base-content/40 italic font-normal hover:text-base-content/70';
      const label = isWorn
        ? `✓ ${i18n.t('lang.CALENDAR_WORN')}`
        : i18n.t('lang.CALENDAR_MARK_WORN_PROMPT');
      return res.render('partials/calendar_worn_button', {
        layout: false,
        entryId: id,
        week,
        btnClass,
        label,
      });
    }

    // Non-HTMX fallback: full redirect
    return res.redirect(303, `/calendar?week=${week}`);
  }
}
