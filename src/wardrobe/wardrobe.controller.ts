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
  UseInterceptors,
} from '@nestjs/common';
import { type Request, type Response } from 'express';
import { ConditionalAuthGuard } from '../auth/conditional-auth.guard';
import { Payload } from '../auth/dto/payload.dto';
import { GarmentCategory } from '../dal/entity/garment-category.enum';
import { GarmentColor } from '../dal/entity/garment-color.enum';
import * as garmentService from './garment.service';
import type { SearchGarmentDto } from '../dal/dto/search-garment.dto';
import {
  MultipartFiles,
  MultipartFileStream,
  MultipartInterceptor,
} from '@proventuslabs/nestjs-multipart-form';
import { Observable } from 'rxjs';

@UseGuards(ConditionalAuthGuard)
@Controller('wardrobe')
export class WardrobeController {
  private readonly logger = new Logger(WardrobeController.name);

  constructor(
    @Inject()
    private readonly garmentService: garmentService.GarmentService,
  ) {}

  private userId(req: Request): number | undefined {
    return (req['user'] as Payload | undefined)?.userId;
  }

  @Get()
  @Render('wardrobe/index')
  async index(@Req() req: Request, @Query() query: SearchGarmentDto) {
    const [garments, filters] = await Promise.all([
      this.garmentService.findAll(this.userId(req), query),
      this.garmentService.findAvailableFilters(this.userId(req)),
    ]);
    return {
      garments,
      categories: Object.values(GarmentCategory),
      colors: Object.values(GarmentColor),
      availableSizes: filters.sizes,
      search: query,
    };
  }

  @Get('new')
  @Render('wardrobe/form')
  newForm() {
    return {
      categories: Object.values(GarmentCategory),
      colors: Object.values(GarmentColor),
      garment: null,
    };
  }

  @Post()
  async create(
    @Body()
    body: {
      name: string;
      category: GarmentCategory;
      brand?: string;
      color?: GarmentColor;
      size?: string;
      notes?: string;
    },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const garment = await this.garmentService.create(
      {
        name: body.name,
        category: body.category,
        brand: body.brand,
        color: body.color,
        size: body.size,
        notes: body.notes,
      },
      this.userId(req),
    );
    return res.redirect(`/wardrobe/${garment.id}`);
  }

  @Get(':id')
  @Render('wardrobe/show')
  async show(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const garment = await this.garmentService.findOne(id, this.userId(req));
    return { garment };
  }

  @Get(':id/edit')
  @Render('wardrobe/form')
  async editForm(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const garment = await this.garmentService.findOne(id, this.userId(req));
    return {
      garment,
      categories: Object.values(GarmentCategory),
      colors: Object.values(GarmentColor),
    };
  }

  @Post(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      name?: string;
      category?: GarmentCategory;
      brand?: string;
      color?: GarmentColor;
      size?: string;
      notes?: string;
    },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    await this.garmentService.update(
      id,
      {
        name: body.name,
        category: body.category,
        brand: body.brand,
        color: body.color,
        size: body.size,
        notes: body.notes,
      },
      this.userId(req),
    );
    return res.redirect(`/wardrobe/${id}`);
  }

  @Post(':id/photo')
  @UseInterceptors(MultipartInterceptor())
  async uploadPhoto(
    @Param('id', ParseIntPipe) id: number,
    @MultipartFiles('photo') photo$: Observable<MultipartFileStream>,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    await this.garmentService.update(id, { photo$: photo$ }, this.userId(req));
    res.setHeader('HX-Redirect', `/wardrobe/${id}`);
    return res.send();
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    await this.garmentService.remove(id, this.userId(req));
    res.setHeader('HX-Redirect', '/wardrobe');
    return res.send();
  }
}
