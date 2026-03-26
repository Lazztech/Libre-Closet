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
    return {
      outfit: null,
      categoryRows: this.buildCategoryRows(garments, [], i18n),
    };
  }

  @Post()
  async create(
    @Body()
    body: {
      name: string;
      notes?: string;
      garmentIds?: string | string[];
    },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const garmentIds = Array.isArray(body.garmentIds)
      ? body.garmentIds.map(Number)
      : body.garmentIds
        ? [Number(body.garmentIds)]
        : [];

    const outfit = await this.outfitService.create(
      { name: body.name, notes: body.notes, garmentIds },
      this.userId(req),
    );
    return res.redirect(`/outfits/${outfit.id}`);
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
      categoryRows: this.buildCategoryRows(garments, selectedGarmentIds, i18n),
    };
  }

  @Post(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      name?: string;
      notes?: string;
      garmentIds?: string | string[];
    },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const garmentIds = Array.isArray(body.garmentIds)
      ? body.garmentIds.map(Number)
      : body.garmentIds
        ? [Number(body.garmentIds)]
        : [];

    await this.outfitService.update(
      id,
      { name: body.name, notes: body.notes, garmentIds },
      this.userId(req),
    );
    return res.redirect(`/outfits/${id}`);
  }

  private buildCategoryRows(
    garments: Garment[],
    selectedIds: number[],
    i18n: I18nContext,
  ) {
    const grouped: Partial<Record<string, Garment[]>> = {};
    for (const g of garments) {
      (grouped[g.category] ??= []).push(g);
    }
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
      const selectedIndex = items.findIndex((g) => selectedIds.includes(g.id));
      return {
        value: cat,
        label: this.garmentService.resolveCategoryLabel(cat, i18n),
        garments: items.map((g, i) => ({
          id: g.id,
          name: g.name,
          photo: g.photo,
          brand: g.brand ?? null,
          color: g.color ?? null,
          size: g.size ?? null,
          notes: g.notes ?? null,
          isVisible: selectedIndex === i,
        })),
        initialIndex: selectedIndex >= 0 ? selectedIndex + 1 : 0,
        initialIsNoneVisible: selectedIndex === -1,
        initialGarmentId: selectedIndex >= 0 ? items[selectedIndex].id : null,
        garmentCount: items.length,
      };
    });
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
