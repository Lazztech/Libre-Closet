import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
import { FastifyReply, FastifyRequest } from 'fastify';
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
    private readonly outfitService: OutfitService,
    private readonly garmentService: GarmentService,
    private readonly calendarService: CalendarService,
  ) {}

  private userId(req: FastifyRequest): number | undefined {
    return (req['user'] as Payload | undefined)?.userId;
  }

  @Get()
  @Render('outfits/index')
  async index(@Req() req: FastifyRequest) {
    const outfits = await this.outfitService.findAll(this.userId(req));
    return { outfits };
  }

  @Get('new')
  @Render('outfits/form')
  async newForm(
    @Req() req: FastifyRequest,
    @I18n() i18n: I18nContext,
    @Query('scheduleDate') scheduleDate?: string,
    @Query('returnTo') returnTo?: string,
  ) {
    const garments = await this.garmentService.findAll(this.userId(req));
    const categoryRows = this.outfitService.buildCategoryRows(
      garments,
      [],
      i18n,
    );
    return {
      outfit: null,
      scheduleDate: scheduleDate || null,
      returnTo: returnTo || '/outfits',
      categoryRows,
      allCategoryRows: categoryRows,
    };
  }

  @Post()
  async create(
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
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
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
      return reply.redirect(week ? `/calendar?week=${week}` : '/calendar', 302);
    }
    return reply.redirect(`/outfits/${outfit.id}`, 302);
  }

  @Get('row-fragment')
  async rowFragment(
    @Query('category') category: string,
    @Query('index') indexStr: string,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @I18n() i18n: I18nContext,
  ) {
    if (!category?.trim()) return reply.status(400).send();
    const garments = await this.garmentService.findAll(this.userId(req));
    const items = garments.filter((g) => g.category === category);
    const count = items.length;
    const idx = Math.min(Math.max(parseInt(indexStr) || 0, 0), count);
    const row = this.outfitService.buildRow(category, items, idx, i18n);
    return reply.view('partials/outfit_row', { layout: false, row });
  }

  @Get(':id')
  @Render('outfits/show')
  async show(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: FastifyRequest,
  ) {
    const outfit = await this.outfitService.findOne(id, this.userId(req));
    return { outfit };
  }

  @Get(':id/edit')
  @Render('outfits/form')
  async editForm(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: FastifyRequest,
    @I18n() i18n: I18nContext,
    @Query('returnTo') returnTo?: string,
    @Query('returnToWeek') returnToWeek?: string,
  ) {
    const [outfit, garments] = await Promise.all([
      this.outfitService.findOne(id, this.userId(req)),
      this.garmentService.findAll(this.userId(req)),
    ]);
    const selectedGarmentIds = outfit.garments.getItems().map((g) => g.id);
    return {
      outfit,
      returnTo: returnTo || `/outfits/${id}`,
      returnToWeek: returnToWeek || null,
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
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
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
      return reply.redirect(week ? `/calendar?week=${week}` : '/calendar', 302);
    }
    return reply.redirect(`/outfits/${id}`, 302);
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    await this.outfitService.remove(id, this.userId(req));
    reply.header('HX-Redirect', '/outfits');
    return reply.send();
  }
}
