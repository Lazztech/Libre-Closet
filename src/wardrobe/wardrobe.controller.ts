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
  UseInterceptors,
} from '@nestjs/common';
import { type Request, type Response } from 'express';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
import { Payload } from '../auth/dto/payload.dto';
import { GarmentCategory } from '../dal/entity/garment.entity';
import { GarmentService } from './garment.service';
import {
  MultipartFiles,
  MultipartFileStream,
  MultipartInterceptor,
} from '@proventuslabs/nestjs-multipart-form';
import { Observable } from 'rxjs';

@UseGuards(OptionalAuthGuard)
@Controller('wardrobe')
export class WardrobeController {
  private readonly logger = new Logger(WardrobeController.name);

  constructor(
    @Inject()
    private readonly garmentService: GarmentService,
  ) {}

  private userId(req: Request): number | undefined {
    return (req['user'] as Payload | undefined)?.userId;
  }

  @Get()
  @Render('wardrobe/index')
  async index(@Req() req: Request) {
    const garments = await this.garmentService.findAll(this.userId(req));
    return { garments, categories: Object.values(GarmentCategory) };
  }

  @Get('new')
  @Render('wardrobe/form')
  newForm() {
    return { categories: Object.values(GarmentCategory), garment: null };
  }

  @Post()
  async create(
    @Body()
    body: {
      name: string;
      category: GarmentCategory;
      brand?: string;
      colors?: string | string[];
      size?: string;
      notes?: string;
    },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const colors =
      typeof body.colors === 'string'
        ? body.colors
            .split(',')
            .map((c) => c.trim())
            .filter(Boolean)
        : (body.colors ?? []);

    const garment = await this.garmentService.create(
      {
        name: body.name,
        category: body.category,
        brand: body.brand,
        colors,
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
    return { garment, categories: Object.values(GarmentCategory) };
  }

  @Post(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      name?: string;
      category?: GarmentCategory;
      brand?: string;
      colors?: string | string[];
      size?: string;
      notes?: string;
    },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const colors =
      typeof body.colors === 'string'
        ? body.colors
            .split(',')
            .map((c) => c.trim())
            .filter(Boolean)
        : (body.colors ?? undefined);

    await this.garmentService.update(
      id,
      {
        name: body.name,
        category: body.category,
        brand: body.brand,
        colors,
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
