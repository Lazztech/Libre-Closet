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
import type { SearchGarmentDto } from './dto/search-garment.dto';
import { GarmentColor } from './garment-color.enum';
import {
  SEASONS,
  OCCASIONS,
  GARMENT_LOOK,
  getSubcategoriesForCategory,
  compareSubCategories,
} from './additional-properties';

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
  async index(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query('offset') offsetStr?: string,
    @Query('limit') limitStr?: string,
    @Query('batch') batchStr?: string,
  ) {
    const offset = offsetStr ? Math.max(0, parseInt(offsetStr, 10) || 0) : 0;
    const limit = limitStr ? Math.max(1, parseInt(limitStr, 10) || 50) : 50;
    const { outfits, total, hasMore } = await this.outfitService.findPaginated(
      this.userId(req),
      limit,
      offset,
    );
    const nextOffset = offset + outfits.length;
    const data = {
      outfits,
      total,
      hasMore,
      nextOffset,
      limit,
    };

    if (batchStr === 'true') {
      return reply.viewPartial('partials/outfit_cards_batch', data);
    }
    return reply.view('outfits/index', data);
  }

  @Get('new')
  @Render('outfits/form')
  async newForm(
    @Req() req: FastifyRequest,
    @I18n() i18n: I18nContext,
    @Query('scheduleDate') scheduleDate?: string,
    @Query('returnTo') returnTo?: string,
    @Query('returnToView') returnToView?: string,
    @Query('returnToMonth') returnToMonth?: string,
  ) {
    const garments = await this.garmentService.findAll(this.userId(req));
    const categoryRows = this.outfitService.buildCategoryRows(
      garments,
      [],
      i18n,
      undefined,
      true,
    );
    const allCategoryRows = this.outfitService.buildCategoryRows(
      garments,
      [],
      i18n,
      undefined,
      false,
    );
    return {
      outfit: null,
      scheduleDate: scheduleDate || null,
      returnTo: returnTo || '/outfits',
      returnToView: returnToView || null,
      returnToMonth: returnToMonth || null,
      categoryRows,
      allCategoryRows,
      seasons: SEASONS,
      occasions: OCCASIONS,
      looks: GARMENT_LOOK,
    };
  }

  private parseRating(rating?: string | number): number | null | undefined {
    if (rating === undefined) return undefined;
    if (rating === '' || rating === null) return null;
    const parsed = parseInt(String(rating), 10);
    return isNaN(parsed) ? undefined : parsed;
  }

  private resolveRowIndex(
    items: Garment[],
    indexStr?: string,
    garmentIdStr?: string,
  ): number {
    const count = items.length;
    if (garmentIdStr !== undefined && garmentIdStr !== '') {
      const gId = parseInt(garmentIdStr, 10);
      if (gId === 0) return 0;
      const found = items.findIndex((g) => g.id === gId);
      return found >= 0 ? found + 1 : 0;
    }
    const rawIdx =
      indexStr !== undefined && indexStr !== '' ? parseInt(indexStr, 10) : 1;
    return Math.min(Math.max(isNaN(rawIdx) ? 1 : rawIdx, 0), count);
  }

  @Post()
  async create(
    @Body()
    body: {
      name?: string;
      notes?: string;
      rating?: string | number;
      scheduleDate?: string;
      category?: string | string[];
      garmentId?: string | string[];
      returnTo?: string;
      returnToWeek?: string;
      returnToView?: string;
      returnToMonth?: string;
      look?: string;
      occasions?: string | string[];
      seasons?: string | string[];
    },
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    const slots = this.outfitService.parseSlotsFromBody(
      body.category,
      body.garmentId,
    );
    const rating = this.parseRating(body.rating);

    const rawSeasons = Array.isArray(body.seasons)
      ? body.seasons
      : (body.seasons
          ?.split(',')
          .map((s) => s.trim())
          .filter(Boolean) ?? []);
    const rawOccasions = Array.isArray(body.occasions)
      ? body.occasions
      : (body.occasions
          ?.split(',')
          .map((s) => s.trim())
          .filter(Boolean) ?? []);

    const outfit = await this.outfitService.create(
      {
        name: body.name,
        notes: body.notes,
        rating: rating ?? undefined,
        slots,
        look: body.look?.trim() || undefined,
        occasions: rawOccasions.length > 0 ? rawOccasions.join(',') : undefined,
        seasons: rawSeasons.length > 0 ? rawSeasons.join(',') : undefined,
      },
      this.userId(req),
    );
    if (body.scheduleDate) {
      await this.calendarService.create(
        { date: new Date(body.scheduleDate), outfitId: outfit.id },
        this.userId(req),
      );
    }
    if (body.returnTo === '/calendar') {
      if (body.returnToView === 'month') {
        const month =
          body.returnToMonth ??
          (body.scheduleDate ? body.scheduleDate.slice(0, 7) : '');
        return reply.redirect(
          month
            ? `/calendar?view=month&month=${month}`
            : '/calendar?view=month',
          302,
        );
      }
      const week = body.returnToWeek ?? body.scheduleDate;
      return reply.redirect(week ? `/calendar?week=${week}` : '/calendar', 302);
    }
    return reply.redirect(`/outfits/${outfit.id}`, 302);
  }

  @Get('row-fragment')
  async rowFragment(
    @Query('category') category: string,
    @Query('index') indexStr: string,
    @Query('garmentId') garmentIdStr: string,
    @Query('rowId') rowId: string,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @I18n() i18n: I18nContext,
  ) {
    if (!category?.trim()) return reply.status(400).send();
    const garments = await this.garmentService.findAll(this.userId(req));
    const items = garments.filter((g) => g.category === category);
    const idx = this.resolveRowIndex(items, indexStr, garmentIdStr);
    const row = this.outfitService.buildRow(category, items, idx, i18n, rowId);
    return reply.viewPartial('partials/outfit_row', { row });
  }

  @Get('picker-modal')
  async pickerModal(
    @Query() query: SearchGarmentDto & { currentId?: string; rowId?: string },
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @I18n() i18n: I18nContext,
  ) {
    const category = query.category?.trim();
    if (!category) return reply.status(400).send();

    const userId = this.userId(req);
    const [garments, filters] = await Promise.all([
      this.garmentService.findAll(userId, {
        ...query,
        category,
      }),
      this.garmentService.findAvailableFilters(userId),
    ]);

    const categoryLabel = this.garmentService.resolveCategoryLabel(
      category,
      i18n,
    );
    const currentId =
      query.currentId !== undefined && query.currentId !== ''
        ? parseInt(query.currentId, 10)
        : null;

    const baseSubcats = getSubcategoriesForCategory(category);
    const availableSubCategories = Array.from(
      new Set([...baseSubcats, ...(filters.subCategories || [])]),
    )
      .filter(Boolean)
      .sort((a, b) => compareSubCategories(a, b, 1));

    const currentSortBy = query.sortBy || 'recently_added';
    const defaultSortOrder = [
      'rating',
      'recently_added',
      'dateAquired',
    ].includes(currentSortBy)
      ? 'desc'
      : 'asc';
    const currentSortOrder = query.sortOrder || defaultSortOrder;

    let activeSortLabel: string | null = null;
    if (query.sortBy && query.sortBy !== 'recently_added') {
      const propMap: Record<string, string> = {
        name: i18n.t('lang.NAME'),
        subCategory: i18n.t('lang.SUB_CATEGORY'),
        rating: i18n.t('lang.RATING'),
        cost: i18n.t('lang.COST'),
        brand: i18n.t('lang.BRAND'),
        color: i18n.t('lang.COLOR'),
        size: i18n.t('lang.SIZE'),
        dateAquired: i18n.t('lang.DATE_AQUIRED'),
        season: i18n.t('lang.SEASON'),
        seasons: i18n.t('lang.SEASONS'),
        occasion: i18n.t('lang.OCCASION'),
        occasions: i18n.t('lang.OCCASIONS'),
      };
      const propLabel = propMap[query.sortBy] || query.sortBy;
      let orderLabel = '';
      if (['rating', 'cost'].includes(query.sortBy)) {
        orderLabel =
          currentSortOrder === 'desc' ? 'High to Low' : 'Low to High';
      } else if (query.sortBy === 'dateAquired') {
        orderLabel = currentSortOrder === 'desc' ? 'Newest' : 'Oldest';
      } else if (['category', 'subCategory'].includes(query.sortBy)) {
        orderLabel = currentSortOrder === 'desc' ? 'Reverse' : 'Priority';
      } else {
        orderLabel = currentSortOrder === 'desc' ? 'Z–A' : 'A–Z';
      }
      activeSortLabel = `${propLabel} (${orderLabel})`;
    }

    const sortPropertyOptions = [
      { key: 'recently_added', label: i18n.t('lang.SORT_RECENTLY_ADDED') },
      { key: 'subCategory', label: i18n.t('lang.SUB_CATEGORY') },
      { key: 'name', label: i18n.t('lang.NAME') },
      { key: 'rating', label: i18n.t('lang.RATING') },
      { key: 'cost', label: i18n.t('lang.COST') },
      { key: 'brand', label: i18n.t('lang.BRAND') },
      { key: 'color', label: i18n.t('lang.COLOR') },
      { key: 'size', label: i18n.t('lang.SIZE') },
      { key: 'dateAquired', label: i18n.t('lang.DATE_AQUIRED') },
    ];

    let activeFilterCount = 0;
    if (query.subCategory) activeFilterCount++;
    if (query.color) activeFilterCount++;
    if (query.size) activeFilterCount++;
    if (query.season) activeFilterCount++;
    if (query.occasion) activeFilterCount++;
    if (query.rating) activeFilterCount++;

    return reply.viewPartial('partials/garment_picker_modal', {
      category,
      categoryLabel,
      garments,
      currentId,
      rowId: query.rowId,
      search: query,
      activeSortLabel,
      currentSortBy,
      currentSortOrder,
      sortPropertyOptions,
      availableSubCategories,
      colors: Object.values(GarmentColor),
      availableSizes: filters.sizes,
      availableSeasons: SEASONS.map((s) => s.name),
      availableOccasions: OCCASIONS.map((o) => o.name),
      ratingOptions: [5, 4, 3, 2, 1],
      activeFilterCount,
    });
  }

  @Get(':id')
  @Render('outfits/show')
  async show(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: FastifyRequest,
  ) {
    const outfit = await this.outfitService.findOne(id, this.userId(req));
    const garments = this.outfitService.getOrderedGarments(outfit);
    return {
      outfit,
      garments,
      seasonsList:
        outfit.seasons
          ?.split(',')
          .map((s) => s.trim())
          .filter(Boolean) ?? [],
      occasionsList:
        outfit.occasions
          ?.split(',')
          .map((o) => o.trim())
          .filter(Boolean) ?? [],
    };
  }

  @Get(':id/edit')
  @Render('outfits/form')
  async editForm(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: FastifyRequest,
    @I18n() i18n: I18nContext,
    @Query('returnTo') returnTo?: string,
    @Query('returnToWeek') returnToWeek?: string,
    @Query('returnToView') returnToView?: string,
    @Query('returnToMonth') returnToMonth?: string,
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
      returnToView: returnToView || null,
      returnToMonth: returnToMonth || null,
      categoryRows: this.outfitService.buildCategoryRows(
        garments,
        selectedGarmentIds,
        i18n,
        outfit.slots,
      ),
      allCategoryRows: this.outfitService.buildCategoryRows(
        garments,
        [],
        i18n,
        undefined,
        false,
      ),
      seasons: SEASONS,
      occasions: OCCASIONS,
      looks: GARMENT_LOOK,
    };
  }

  @Post(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      name?: string;
      notes?: string;
      rating?: string | number;
      scheduleDate?: string;
      category?: string | string[];
      garmentId?: string | string[];
      returnTo?: string;
      returnToWeek?: string;
      returnToView?: string;
      returnToMonth?: string;
      look?: string;
      occasions?: string | string[];
      seasons?: string | string[];
    },
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    const slots = this.outfitService.parseSlotsFromBody(
      body.category,
      body.garmentId,
    );
    const rating = this.parseRating(body.rating);

    const rawSeasons =
      body.seasons !== undefined
        ? Array.isArray(body.seasons)
          ? body.seasons
          : body.seasons
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
        : undefined;

    const rawOccasions =
      body.occasions !== undefined
        ? Array.isArray(body.occasions)
          ? body.occasions
          : body.occasions
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
        : undefined;

    await this.outfitService.update(
      id,
      {
        name: body.name,
        notes: body.notes,
        rating,
        slots,
        look:
          body.look !== undefined ? body.look.trim() || undefined : undefined,
        occasions:
          rawOccasions !== undefined
            ? rawOccasions.length > 0
              ? rawOccasions.join(',')
              : undefined
            : undefined,
        seasons:
          rawSeasons !== undefined
            ? rawSeasons.length > 0
              ? rawSeasons.join(',')
              : undefined
            : undefined,
      },
      this.userId(req),
    );
    if (body.scheduleDate) {
      await this.calendarService.create(
        { date: new Date(body.scheduleDate), outfitId: id },
        this.userId(req),
      );
    }
    if (body.returnTo === '/calendar') {
      if (body.returnToView === 'month') {
        const month =
          body.returnToMonth ??
          (body.scheduleDate ? body.scheduleDate.slice(0, 7) : '');
        return reply.redirect(
          month
            ? `/calendar?view=month&month=${month}`
            : '/calendar?view=month',
          302,
        );
      }
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
