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
import { ConditionalAuthGuard } from '../auth/conditional-auth.guard';
import { Payload } from '../auth/dto/payload.dto';
import { Garment } from '../dal/entity/garment.entity';
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
  async newForm(@Req() req: Request) {
    const garments = await this.garmentService.findAll(this.userId(req));
    return { outfit: null, categoryRows: this.buildCategoryRows(garments, []) };
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
  async editForm(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const [outfit, garments] = await Promise.all([
      this.outfitService.findOne(id, this.userId(req)),
      this.garmentService.findAll(this.userId(req)),
    ]);
    const selectedGarmentIds = outfit.garments.getItems().map((g) => g.id);
    return {
      outfit,
      categoryRows: this.buildCategoryRows(garments, selectedGarmentIds),
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

  private buildCategoryRows(garments: Garment[], selectedIds: number[]) {
    const CATEGORY_ORDER = [
      'underwear',
      'lingerie',
      'tops',
      'bottoms',
      'dresses',
      'activewear',
      'swimwear',
      'outerwear',
      'footwear',
      'bags',
      'accessories',
      'other',
    ];
    const grouped: Partial<Record<string, Garment[]>> = {};
    for (const g of garments) {
      (grouped[g.category] ??= []).push(g);
    }
    return CATEGORY_ORDER.filter((cat) => grouped[cat]?.length).map((cat) => {
      const items = grouped[cat]!;
      const selectedIndex = items.findIndex((g) => selectedIds.includes(g.id));
      return {
        category: cat,
        garments: items.map((g, i) => ({
          id: g.id,
          name: g.name,
          photo: g.photo,
          isVisible: selectedIndex === i,
        })),
        initialIndex: selectedIndex >= 0 ? selectedIndex + 1 : 0,
        initialIsNoneVisible: selectedIndex === -1,
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
