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
import { GarmentCategory } from './garment-category.enum';
import { DrawerService } from './drawer.service';
import { GarmentService } from './garment.service';

@UseGuards(ConditionalAuthGuard)
@Controller('drawers')
export class DrawerController {
  private readonly logger = new Logger(DrawerController.name);

  constructor(
    private readonly drawerService: DrawerService,
    private readonly garmentService: GarmentService,
  ) {}

  private userId(req: FastifyRequest): number | undefined {
    return (req['user'] as Payload | undefined)?.userId;
  }

  private parseGarmentIds(garmentId: string | string[] | undefined): number[] {
    const ids = Array.isArray(garmentId)
      ? garmentId
      : garmentId
        ? [garmentId]
        : [];
    return ids.map(Number).filter((id) => !Number.isNaN(id));
  }

  private async availableCategories(
    userId: number | undefined,
    i18n: I18nContext,
  ) {
    const filters = await this.garmentService.findAvailableFilters(userId);
    const enumValues = Object.values(GarmentCategory) as string[];
    const customCategories = filters.categories.filter(
      (c) => !enumValues.includes(c),
    );
    return [...enumValues, ...customCategories].map((value) => ({
      value,
      label: this.garmentService.resolveCategoryLabel(value, i18n),
    }));
  }

  @Get()
  @Render('drawers/index')
  async index(@Req() req: FastifyRequest) {
    const drawers = await this.drawerService.findAll(this.userId(req));
    // Preview thumbnails are capped so a large drawer doesn't turn its index
    // card into a multi-screen-tall block that pushes other drawers off-screen.
    const drawersWithPreview = await Promise.all(
      drawers.map(async (d) => {
        const { items, total } = await this.drawerService.findPreviewGarments(
          d.id,
        );
        return {
          id: d.id,
          name: d.name,
          notes: d.notes,
          previewGarments: items,
          totalGarmentCount: total,
          overflowCount: Math.max(0, total - items.length),
        };
      }),
    );
    return { drawers: drawersWithPreview };
  }

  @Get('new')
  @Render('drawers/form')
  async newForm(@Req() req: FastifyRequest, @I18n() i18n: I18nContext) {
    const userId = this.userId(req);
    const [garments, categories] = await Promise.all([
      this.garmentService.findAll(userId),
      this.availableCategories(userId, i18n),
    ]);
    return { drawer: null, garments, selectedGarmentIds: [], categories };
  }

  @Post()
  async create(
    @Body()
    body: {
      name: string;
      notes?: string;
      garmentId?: string | string[];
    },
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    const drawer = await this.drawerService.create(
      {
        name: body.name,
        notes: body.notes,
        garmentIds: this.parseGarmentIds(body.garmentId),
      },
      this.userId(req),
    );
    return reply.redirect(`/drawers/${drawer.id}`, 302);
  }

  @Get(':id')
  @Render('drawers/show')
  async show(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: FastifyRequest,
    @Query('page') page: string | undefined,
  ) {
    const userId = this.userId(req);
    // findOneMeta checks access without populating the (potentially huge)
    // garments collection; the paginated garment page is fetched separately
    // so DOM/HTML size stays bounded regardless of drawer size.
    const drawer = await this.drawerService.findOneMeta(id, userId);
    const {
      items,
      total,
      page: currentPage,
      totalPages,
    } = await this.garmentService.findAllPaginated(userId, {
      drawerId: String(id),
      page,
    });
    return {
      drawer,
      garments: items,
      total,
      page: currentPage,
      totalPages,
      showPagination: totalPages > 1,
      hasPrevPage: currentPage > 1,
      hasNextPage: currentPage < totalPages,
      prevPageUrl: `/drawers/${id}?page=${currentPage - 1}`,
      nextPageUrl: `/drawers/${id}?page=${currentPage + 1}`,
    };
  }

  @Get(':id/edit')
  @Render('drawers/form')
  async editForm(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: FastifyRequest,
    @I18n() i18n: I18nContext,
  ) {
    const userId = this.userId(req);
    const [drawer, garments, categories] = await Promise.all([
      this.drawerService.findOne(id, userId),
      this.garmentService.findAll(userId),
      this.availableCategories(userId, i18n),
    ]);
    const selectedGarmentIds = drawer.garments.getItems().map((g) => g.id);
    return { drawer, garments, selectedGarmentIds, categories };
  }

  @Post(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      name?: string;
      notes?: string;
      garmentId?: string | string[];
    },
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    await this.drawerService.update(
      id,
      {
        name: body.name,
        notes: body.notes,
        garmentIds: this.parseGarmentIds(body.garmentId),
      },
      this.userId(req),
    );
    return reply.redirect(`/drawers/${id}`, 302);
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    await this.drawerService.remove(id, this.userId(req));
    reply.header('HX-Redirect', '/drawers');
    return reply.send();
  }
}
