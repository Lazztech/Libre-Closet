import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Logger,
  Param,
  ParseIntPipe,
  Post,
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
import { OutfitService } from './outfit.service';
import { GarmentService } from './garment.service';
import { CalendarService } from './calendar.service';

@UseGuards(ConditionalAuthGuard)
@Controller('outfits')
export class OutfitController {
  private readonly logger = new Logger(OutfitController.name);

  constructor(
    @Inject()
    private readonly outfitService: OutfitService,
    @Inject()
    private readonly garmentService: GarmentService,
    @Inject()
    private readonly calendarService: CalendarService,
  ) {}

  private userId(req: Request): number | undefined {
    return (req['user'] as Payload | undefined)?.userId;
  }

  @Get()
  @Render('outfits/index')
  async index(@Req() req: Request) {
    const outfits = await this.outfitService.findAll(this.userId(req));
    return { outfits };
  }

  @Get('new')
  @Render('outfits/form')
  async newForm(@Req() req: Request, @I18n() i18n: I18nContext) {
    const garments = await this.garmentService.findAll(this.userId(req));
    const categoryRows = this.outfitService.buildCategoryRows(
      garments,
      [],
      i18n,
    );
    const scheduleDate = (req.query['scheduleDate'] as string) || null;
    const returnTo = (req.query['returnTo'] as string) || '/outfits';
    return {
      outfit: null,
      scheduleDate,
      returnTo,
      categoryRows,
      allCategoryRows: categoryRows,
    };
  }

  @Post()
  async create(
    @Body()
    body: {
      name: string;
      notes?: string;
      scheduleDate?: string;
      category?: string | string[];
      garmentId?: string | string[];
      returnTo?: string;
      returnToWeek?: string;
    },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const slots = this.outfitService.parseSlotsFromBody(
      body.category,
      body.garmentId,
    );

    const outfit = await this.outfitService.create(
      { name: body.name, notes: body.notes, slots },
      this.userId(req),
    );
    if (body.scheduleDate) {
      await this.calendarService.create(
        { date: new Date(body.scheduleDate), outfitId: outfit.id },
        this.userId(req),
      );
    }
    if (body.returnTo === '/calendar') {
      const week = body.returnToWeek ?? body.scheduleDate;
      return res.redirect(week ? `/calendar?week=${week}` : '/calendar');
    }
    return res.redirect(`/outfits/${outfit.id}`);
  }

  @Get('row-fragment')
  async rowFragment(
    @Query('category') category: string,
    @Query('index') indexStr: string,
    @Req() req: Request,
    @Res() res: Response,
    @I18n() i18n: I18nContext,
  ) {
    if (!category?.trim()) return res.status(400).send();
    const garments = await this.garmentService.findAll(this.userId(req));
    const items = garments.filter((g) => g.category === category);
    const count = items.length;
    const idx = Math.min(Math.max(parseInt(indexStr) || 0, 0), count);
    const row = this.outfitService.buildRow(category, items, idx, i18n);
    return res.render('partials/outfit_row', { layout: false, row });
  }

  @Get(':id')
  @Render('outfits/show')
  async show(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const outfit = await this.outfitService.findOne(id, this.userId(req));
    return { outfit };
  }

  @Get(':id/edit')
  @Render('outfits/form')
  async editForm(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
    @I18n() i18n: I18nContext,
  ) {
    const [outfit, garments] = await Promise.all([
      this.outfitService.findOne(id, this.userId(req)),
      this.garmentService.findAll(this.userId(req)),
    ]);
    const selectedGarmentIds = outfit.garments.getItems().map((g) => g.id);
    const returnTo = (req.query['returnTo'] as string) || `/outfits/${id}`;
    const returnToWeek = (req.query['returnToWeek'] as string) || null;
    return {
      outfit,
      returnTo,
      returnToWeek,
      categoryRows: this.outfitService.buildCategoryRows(
        garments,
        selectedGarmentIds,
        i18n,
        outfit.slots,
      ),
      allCategoryRows: this.outfitService.buildCategoryRows(garments, [], i18n),
    };
  }

  @Post(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      name?: string;
      notes?: string;
      scheduleDate?: string;
      category?: string | string[];
      garmentId?: string | string[];
      returnTo?: string;
      returnToWeek?: string;
    },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const slots = this.outfitService.parseSlotsFromBody(
      body.category,
      body.garmentId,
    );

    await this.outfitService.update(
      id,
      { name: body.name, notes: body.notes, slots },
      this.userId(req),
    );
    if (body.scheduleDate) {
      await this.calendarService.create(
        { date: new Date(body.scheduleDate), outfitId: id },
        this.userId(req),
      );
    }
    if (body.returnTo === '/calendar') {
      const week = body.returnToWeek ?? body.scheduleDate;
      return res.redirect(week ? `/calendar?week=${week}` : '/calendar');
    }
    return res.redirect(`/outfits/${id}`);
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    await this.outfitService.remove(id, this.userId(req));
    res.setHeader('HX-Redirect', '/outfits');
    return res.send();
  }
}
