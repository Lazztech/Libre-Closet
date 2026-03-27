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
import { Garment } from '../dal/entity/garment.entity';
import { OutfitSlot } from '../dal/entity/outfit.entity';
import { GarmentCategory } from './garment-category.enum';
import { OutfitService } from './outfit.service';
import { GarmentService } from './garment.service';

@UseGuards(ConditionalAuthGuard)
@Controller('outfits')
export class OutfitController {
  private readonly logger = new Logger(OutfitController.name);

  constructor(
    @Inject()
    private readonly outfitService: OutfitService,
    @Inject()
    private readonly garmentService: GarmentService,
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
    const categoryRows = this.buildCategoryRows(garments, [], i18n);
    return {
      outfit: null,
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
      category?: string | string[];
      garmentId?: string | string[];
    },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const slots = this.parseSlotsFromBody(body.category, body.garmentId);

    const outfit = await this.outfitService.create(
      { name: body.name, notes: body.notes, slots },
      this.userId(req),
    );
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
    const row = this.buildRow(category, items, idx, i18n);
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
    return {
      outfit,
      categoryRows: this.buildCategoryRows(
        garments,
        selectedGarmentIds,
        i18n,
        outfit.slots,
      ),
      allCategoryRows: this.buildCategoryRows(garments, [], i18n),
    };
  }

  @Post(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      name?: string;
      notes?: string;
      category?: string | string[];
      garmentId?: string | string[];
    },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const slots = this.parseSlotsFromBody(body.category, body.garmentId);

    await this.outfitService.update(
      id,
      { name: body.name, notes: body.notes, slots },
      this.userId(req),
    );
    return res.redirect(`/outfits/${id}`);
  }

  private buildCategoryRows(
    garments: Garment[],
    selectedIds: number[],
    i18n: I18nContext,
    slots?: OutfitSlot[],
  ) {
    const grouped: Partial<Record<string, Garment[]>> = {};
    for (const g of garments) {
      (grouped[g.category] ??= []).push(g);
    }

    const toRow = (
      category: string,
      items: Garment[],
      selectedId: number | null,
    ) => {
      const selectedIdx =
        selectedId != null ? items.findIndex((g) => g.id === selectedId) : -1;
      const idx = selectedIdx >= 0 ? selectedIdx + 1 : 0;
      return this.buildRow(category, items, idx, i18n);
    };

    // Slot-based path: preserves saved order and duplicate categories
    if (slots?.length) {
      return slots
        .filter((slot) => grouped[slot.category]?.length)
        .map((slot) => {
          const items = grouped[slot.category]!;
          const selected =
            slot.garmentId != null
              ? (items.find((g) => g.id === slot.garmentId) ?? null)
              : null;
          return toRow(slot.category, items, selected?.id ?? null);
        });
    }

    // Fallback: enum order, one row per category with garments
    const enumOrder = Object.values(GarmentCategory);
    const orderedKeys = [
      ...enumOrder.filter((c) => grouped[c]?.length),
      ...Object.keys(grouped)
        .filter(
          (c) => !(enumOrder as string[]).includes(c) && grouped[c]?.length,
        )
        .sort(),
    ];
    return orderedKeys.map((cat) => {
      const items = grouped[cat]!;
      const selected = items.find((g) => selectedIds.includes(g.id)) ?? null;
      return toRow(cat, items, selected?.id ?? null);
    });
  }

  private parseSlotsFromBody(
    category: string | string[] | undefined,
    garmentId: string | string[] | undefined,
  ): OutfitSlot[] {
    const cats = Array.isArray(category)
      ? category
      : category
        ? [category]
        : [];
    const ids = Array.isArray(garmentId)
      ? garmentId
      : garmentId
        ? [garmentId]
        : [];
    return cats.map((cat, i) => ({
      category: cat,
      garmentId: ids[i] ? Number(ids[i]) : null,
    }));
  }

  private buildRow(
    category: string,
    items: Garment[],
    idx: number,
    i18n: I18nContext,
  ) {
    const count = items.length;
    const sel = idx > 0 ? (items[idx - 1] ?? null) : null;
    return {
      value: category,
      label: this.garmentService.resolveCategoryLabel(category, i18n),
      garmentCount: count,
      currentIndex: idx,
      prevIndex: idx === 0 ? count : idx - 1,
      nextIndex: idx === count ? 0 : idx + 1,
      currentGarment: sel
        ? {
            id: sel.id,
            name: sel.name,
            photo: sel.photo ? `/file/nobg/${sel.photo.fileName}` : null,
          }
        : null,
      garmentId: sel?.id ?? null,
    };
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
