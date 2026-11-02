import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
import { I18n, I18nContext } from 'nestjs-i18n';
import { ConditionalAuthGuard } from '../auth/conditional-auth.guard';
import { Payload } from '../auth/dto/payload.dto';
import { GarmentCategory, compareCategories } from './garment-category.enum';
import { GarmentColor } from './garment-color.enum';
import { GarmentService } from './garment.service';
import { WardrobeShareService } from '../wardrobe-share/wardrobe-share.service';
import { SharePermission } from '../dal/entity/wardrobe-share.entity';
import type { SearchGarmentDto } from './dto/search-garment.dto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  SEASONS,
  OCCASIONS,
  COLORS,
  LOOKUPS,
  GARMENT_PRINT,
  GARMENT_LOOK,
  GARMENT_FITS,
  SUBCATEGORIES_BY_CATEGORY,
} from './additional-properties';

@UseGuards(ConditionalAuthGuard)
@Controller('wardrobe')
export class WardrobeController {
  private readonly logger = new Logger(WardrobeController.name);

  constructor(
    private readonly garmentService: GarmentService,
    private readonly shareService: WardrobeShareService,
  ) {}

  private userId(req: any): number | undefined {
    return (req['user'] as Payload | undefined)?.userId;
  }

  private getPropertiesFormContext() {
    return {
      seasons: SEASONS,
      occasions: OCCASIONS,
      colors: COLORS,
      prints: GARMENT_PRINT,
      looks: GARMENT_LOOK,
      fits: GARMENT_FITS,
      subcategoriesByCategory: SUBCATEGORIES_BY_CATEGORY,
      subcategoriesJson: JSON.stringify(SUBCATEGORIES_BY_CATEGORY),
    };
  }

  @Get()
  @Render('wardrobe/index')
  async index(
    @Req() req: FastifyRequest,
    @Query() query: SearchGarmentDto,
    @Query('ownerId') ownerId: string | undefined,
    @I18n() i18n: I18nContext,
  ) {
    const userId = this.userId(req);
    let viewOwner: number | undefined;
    let sharedWardrobes: any[] = [];
    let canEdit = true;

    if (userId != null) {
      sharedWardrobes = await this.shareService.getInboundShares(userId);
      sharedWardrobes = sharedWardrobes.map((s) => ({
        id: s.id,
        grantorId: s.grantor.unwrap().id,
        grantorName: s.grantor.unwrap().firstName || s.grantor.unwrap().email,
        permission: s.permission,
      }));
    }

    if (ownerId && userId != null) {
      viewOwner = parseInt(ownerId, 10);
      if (viewOwner === userId) {
        viewOwner = undefined;
      } else {
        const canView = await this.shareService.canView(userId, viewOwner);
        if (!canView) throw new ForbiddenException();
        const perm = await this.shareService.getSharePermission(
          userId,
          viewOwner,
        );
        canEdit = perm === SharePermission.MANAGE;
      }
    }

    const [garments, filters] = await Promise.all([
      this.garmentService.findAll(userId, query, viewOwner),
      this.garmentService.findAvailableFilters(viewOwner ?? userId),
    ]);
    const enumValues = Object.values(GarmentCategory) as string[];
    const customCategories = filters.categories.filter(
      (c) => !enumValues.includes(c),
    );
    const availableCategories = [...enumValues, ...customCategories]
      .sort((a, b) => compareCategories(a, b, 1))
      .map((value) => ({
        value,
        label: this.garmentService.resolveCategoryLabel(value, i18n),
      }));
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
        category: i18n.t('lang.CATEGORY'),
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
        print: i18n.t('lang.PRINT'),
        look: i18n.t('lang.LOOK'),
        fit: i18n.t('lang.FIT'),
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
      { key: 'category', label: i18n.t('lang.CATEGORY') },
      { key: 'subCategory', label: i18n.t('lang.SUB_CATEGORY') },
      { key: 'name', label: i18n.t('lang.NAME') },
      { key: 'rating', label: i18n.t('lang.RATING') },
      { key: 'cost', label: i18n.t('lang.COST') },
      { key: 'brand', label: i18n.t('lang.BRAND') },
      { key: 'color', label: i18n.t('lang.COLOR') },
      { key: 'size', label: i18n.t('lang.SIZE') },
      { key: 'dateAquired', label: i18n.t('lang.DATE_AQUIRED') },
      { key: 'season', label: i18n.t('lang.SEASON') },
      { key: 'occasion', label: i18n.t('lang.OCCASION') },
      { key: 'print', label: i18n.t('lang.PRINT') },
      { key: 'look', label: i18n.t('lang.LOOK') },
      { key: 'fit', label: i18n.t('lang.FIT') },
    ];

    return {
      garments,
      availableCategories,
      availableSubCategories: filters.subCategories,
      subcategoriesJson: JSON.stringify(SUBCATEGORIES_BY_CATEGORY),
      colors: Object.values(GarmentColor),
      availableSizes: filters.sizes,
      availableSeasons: SEASONS.map((s) => s.name),
      availableOccasions: OCCASIONS.map((o) => o.name),
      ratingOptions: [5, 4, 3, 2, 1],
      search: query,
      currentSortBy,
      currentSortOrder,
      activeSortLabel,
      sortPropertyOptions,
      sharedWardrobes,
      viewOwner: viewOwner ?? null,
      canEdit,
    };
  }

  @Get('new')
  @Render('wardrobe/form')
  async newForm(
    @Req() req: FastifyRequest,
    @I18n() i18n: I18nContext,
    @Query('ownerId') ownerId: string | undefined,
  ) {
    const userId = this.userId(req);
    const viewOwner = ownerId ? parseInt(ownerId, 10) : undefined;
    if (userId != null && viewOwner != null && viewOwner !== userId) {
      const canManage = await this.shareService.canManage(userId, viewOwner);
      if (!canManage) throw new ForbiddenException();
    }
    const filters = await this.garmentService.findAvailableFilters(
      viewOwner ?? userId,
    );
    const enumValues = Object.values(GarmentCategory) as string[];
    const customCategories = filters.categories.filter(
      (c) => !enumValues.includes(c),
    );
    const categories = [...enumValues, ...customCategories]
      .sort((a, b) => compareCategories(a, b, 1))
      .map((value) => ({
        value,
        label: this.garmentService.resolveCategoryLabel(value, i18n),
      }));
    return {
      categories,
      colors: Object.values(GarmentColor),
      garment: null,
      viewOwner,
      ...this.getPropertiesFormContext(),
    };
  }

  @Post()
  async create(
    @Body()
    body: {
      name?: string;
      category: string;
      subCategory?: string;
      brand?: string;
      color?: string | string[];
      size?: string;
      notes?: string;
      washingDetails?: string;
      dateAquired?: string;
      rating?: string | number;
      seasons?: string | string[];
      occasions?: string | string[];
      purchaseLink?: string;
      cost?: string | number;
      print?: string;
      look?: string;
      fit?: string;
    },
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query('ownerId') ownerId: string | undefined,
  ) {
    const userId = this.userId(req);
    const viewOwner = ownerId ? parseInt(ownerId, 10) : undefined;

    if (userId != null && viewOwner != null && viewOwner !== userId) {
      const canManage = await this.shareService.canManage(userId, viewOwner);
      if (!canManage) throw new ForbiddenException();
    }

    // Fastify gives string if one checkbox, string[] if multiple — normalise both
    const rawColors = Array.isArray(body.color)
      ? body.color
      : (body.color
          ?.split(',')
          .map((c) => c.trim())
          .filter(Boolean) ?? []);

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
          .map((o) => o.trim())
          .filter(Boolean) ?? []);

    const parsedRating =
      body.rating != null && body.rating !== ''
        ? parseInt(String(body.rating), 10)
        : undefined;

    const parsedCost =
      body.cost != null && body.cost !== ''
        ? parseFloat(String(body.cost))
        : undefined;

    const garment = await this.garmentService.create(
      {
        name: body.name,
        category: body.category,
        brand: body.brand,
        color: rawColors.length > 0 ? rawColors.join(',') : undefined,
        size: body.size,
        notes: body.notes,
        washingDetails: body.washingDetails,
        dateAquired: body.dateAquired,
        rating: parsedRating,
        seasons: rawSeasons.length > 0 ? rawSeasons.join(',') : undefined,
        occasions: rawOccasions.length > 0 ? rawOccasions.join(',') : undefined,
        purchaseLink: body.purchaseLink?.trim() || undefined,
        cost: parsedCost,
        subCategory: body.subCategory?.trim() || undefined,
        print: body.print?.trim() || undefined,
        look: body.look?.trim() || undefined,
        fit: body.fit?.trim() || undefined,
      },
      viewOwner ?? userId,
    );

    const params = new URLSearchParams({ created: '1' });
    if (viewOwner) params.set('ownerId', String(viewOwner));
    return reply.redirect(`/wardrobe/${garment.id}?${params}`, 302);
  }

  @Get(':id')
  @Render('wardrobe/show')
  async show(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: FastifyRequest,
    @I18n() i18n: I18nContext,
    @Query('ownerId') ownerId: string | undefined,
    @Query('created') created: string | undefined,
    @Query('photoSaved') photoSaved: string | undefined,
  ) {
    const userId = this.userId(req);
    const viewOwner = ownerId ? parseInt(ownerId, 10) : undefined;
    const garment = await this.garmentService.findOne(id, userId, viewOwner);

    let canEdit = true;
    let canDelete = true;
    let canClone = true;
    if (userId != null && viewOwner != null && viewOwner !== userId) {
      const perm = await this.shareService.getSharePermission(
        userId,
        viewOwner,
      );
      canEdit = perm === SharePermission.MANAGE;
      canClone = perm === SharePermission.MANAGE;
      canDelete = false;
    } else if (userId != null && garment.owner?.id !== userId) {
      canEdit = false;
      canDelete = false;
      canClone = false;
    }

    const wearsCount = await this.garmentService.getWearsCount(
      garment.id,
      viewOwner ?? userId,
    );
    const costPerWear =
      garment.cost != null && wearsCount > 0
        ? Number((Number(garment.cost) / wearsCount).toFixed(2))
        : null;

    const colorsList =
      garment.color
        ?.split(',')
        .map((c) => c.trim())
        .filter(Boolean)
        .map((name) => {
          const item = LOOKUPS.colorsByName.get(name.toLowerCase());
          return {
            name,
            hex: item?.hex,
            swatchClass: item ? undefined : name.toLowerCase(),
          };
        }) ?? [];

    return {
      garment,
      categoryLabel: this.garmentService.resolveCategoryLabel(
        garment.category,
        i18n,
      ),
      colorsList,
      wearsCount,
      costPerWear,
      seasonsList:
        garment.seasons
          ?.split(',')
          .map((s) => s.trim())
          .filter(Boolean) ?? [],
      occasionsList:
        garment.occasions
          ?.split(',')
          .map((o) => o.trim())
          .filter(Boolean) ?? [],
      canEdit,
      canDelete,
      canClone,
      viewOwner: viewOwner ?? null,
      justCreated: created === '1',
      justSavedPhoto: photoSaved === '1',
    };
  }

  @Get(':id/edit')
  @Render('wardrobe/form')
  async editForm(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: FastifyRequest,
    @I18n() i18n: I18nContext,
    @Query('ownerId') ownerId: string | undefined,
  ) {
    const userId = this.userId(req);
    const viewOwner = ownerId ? parseInt(ownerId, 10) : undefined;

    if (userId != null && viewOwner != null && viewOwner !== userId) {
      const canManage = await this.shareService.canManage(userId, viewOwner);
      if (!canManage) throw new ForbiddenException();
    }

    const [garment, filters] = await Promise.all([
      this.garmentService.findOne(id, userId, viewOwner),
      this.garmentService.findAvailableFilters(viewOwner ?? userId),
    ]);
    const enumValues = Object.values(GarmentCategory) as string[];
    const customCategories = filters.categories.filter(
      (c) => !enumValues.includes(c),
    );
    const categories = [...enumValues, ...customCategories]
      .sort((a, b) => compareCategories(a, b, 1))
      .map((value) => ({
        value,
        label: this.garmentService.resolveCategoryLabel(value, i18n),
      }));
    const knownColorNames = new Set(COLORS.map((c) => c.name.toLowerCase()));
    const savedColors =
      garment.color
        ?.split(',')
        .map((c) => c.trim())
        .filter(Boolean) ?? [];
    const customColors = savedColors.filter(
      (c) => !knownColorNames.has(c.toLowerCase()),
    );

    return {
      garment,
      categories,
      colors: COLORS,
      customColors,
      viewOwner: viewOwner ?? null,
      ...this.getPropertiesFormContext(),
    };
  }

  @Get(':id/clone')
  @Render('wardrobe/form')
  async cloneForm(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: FastifyRequest,
    @I18n() i18n: I18nContext,
    @Query('ownerId') ownerId: string | undefined,
  ) {
    const userId = this.userId(req);
    const viewOwner = ownerId ? parseInt(ownerId, 10) : undefined;
    const [garment, filters] = await Promise.all([
      this.garmentService.findOne(id, userId, viewOwner),
      this.garmentService.findAvailableFilters(viewOwner ?? userId),
    ]);
    const enumValues = Object.values(GarmentCategory) as string[];
    const customCategories = filters.categories.filter(
      (c) => !enumValues.includes(c),
    );
    const categories = [...enumValues, ...customCategories]
      .sort((a, b) => compareCategories(a, b, 1))
      .map((value) => ({
        value,
        label: this.garmentService.resolveCategoryLabel(value, i18n),
      }));
    return {
      garment,
      isClone: true,
      cloneName: garment.name ? `${garment.name} (cloned)` : undefined,
      categories,
      colors: COLORS,
      viewOwner: viewOwner ?? null,
      ...this.getPropertiesFormContext(),
    };
  }

  @Post(':id/clone')
  async cloneCreate(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      name?: string;
      category: string;
      subCategory?: string;
      brand?: string;
      color?: GarmentColor | string[];
      size?: string;
      notes?: string;
      washingDetails?: string;
      dateAquired?: string;
      rating?: string | number;
      seasons?: string | string[];
      occasions?: string | string[];
      purchaseLink?: string;
      cost?: string | number;
      print?: string;
      look?: string;
      fit?: string;
    },
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query('ownerId') ownerId: string | undefined,
  ) {
    const userId = this.userId(req);
    const viewOwner = ownerId ? parseInt(ownerId, 10) : undefined;
    // Verify the requesting user has access to the source garment
    await this.garmentService.findOne(id, userId, viewOwner);

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
          .map((o) => o.trim())
          .filter(Boolean) ?? []);

    const parsedRating =
      body.rating != null && body.rating !== ''
        ? parseInt(String(body.rating), 10)
        : undefined;

    const parsedCost =
      body.cost != null && body.cost !== ''
        ? parseFloat(String(body.cost))
        : undefined;

    const cloned = await this.garmentService.clone(
      id,
      {
        name: body.name,
        category: body.category,
        brand: body.brand,
        color: Array.isArray(body.color) ? body.color.join(',') : body.color,
        size: body.size,
        notes: body.notes,
        washingDetails: body.washingDetails,
        dateAquired: body.dateAquired,
        rating: parsedRating,
        seasons: rawSeasons.join(','),
        occasions: rawOccasions.join(','),
        purchaseLink: body.purchaseLink?.trim() || undefined,
        cost: parsedCost,
        subCategory: body.subCategory?.trim() || undefined,
        print: body.print?.trim() || undefined,
        look: body.look?.trim() || undefined,
        fit: body.fit?.trim() || undefined,
      },
      userId,
    );
    return reply.redirect(`/wardrobe/${cloned.id}`, 302);
  }

  @Post(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      name?: string;
      category?: string;
      subCategory?: string;
      brand?: string;
      color?: GarmentColor | string[];
      size?: string;
      notes?: string;
      washingDetails?: string;
      dateAquired?: string;
      rating?: string | number;
      seasons?: string | string[];
      occasions?: string | string[];
      purchaseLink?: string;
      cost?: string | number;
      print?: string;
      look?: string;
      fit?: string;
      pattern?: string;
      style?: string;
    },
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query('ownerId') ownerId: string | undefined,
  ) {
    const userId = this.userId(req);
    const viewOwner = ownerId ? parseInt(ownerId, 10) : undefined;

    if (userId != null && viewOwner != null && viewOwner !== userId) {
      const canManage = await this.shareService.canManage(userId, viewOwner);
      if (!canManage) throw new ForbiddenException();
    }

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
          .map((o) => o.trim())
          .filter(Boolean) ?? []);

    const parsedRating =
      body.rating != null && body.rating !== ''
        ? parseInt(String(body.rating), 10)
        : undefined;

    const parsedCost =
      body.cost != null && body.cost !== ''
        ? parseFloat(String(body.cost))
        : undefined;

    await this.garmentService.update(
      id,
      {
        name: body.name,
        category: body.category,
        brand: body.brand,
        color: Array.isArray(body.color) ? body.color.join(',') : body.color,
        size: body.size,
        notes: body.notes,
        washingDetails: body.washingDetails,
        dateAquired: body.dateAquired,
        rating: parsedRating,
        seasons: rawSeasons.join(','),
        occasions: rawOccasions.join(','),
        purchaseLink: body.purchaseLink?.trim() || undefined,
        cost: parsedCost,
        subCategory:
          body.subCategory !== undefined
            ? body.subCategory.trim() || undefined
            : undefined,
        print: (body.print ?? body.pattern)?.trim() || undefined,
        look: (body.look ?? body.style)?.trim() || undefined,
        fit: body.fit?.trim() || undefined,
      },
      viewOwner ?? userId,
      userId,
    );
    const redirectSuffix = viewOwner ? `?ownerId=${viewOwner}` : '';
    return reply.redirect(`/wardrobe/${id}${redirectSuffix}`, 302);
  }

  @Post(':id/photo')
  async uploadPhoto(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query('ownerId') ownerId: string | undefined,
  ) {
    const userId = this.userId(req);
    const viewOwner = ownerId ? parseInt(ownerId, 10) : undefined;

    if (userId != null && viewOwner != null && viewOwner !== userId) {
      const canManage = await this.shareService.canManage(userId, viewOwner);
      if (!canManage) throw new ForbiddenException();
    }

    await this.garmentService.update(
      id,
      { files: req.files({ limits: { files: 2 } }) },
      viewOwner ?? userId,
      userId,
    );
    const params = new URLSearchParams({ photoSaved: '1' });
    if (viewOwner) params.set('ownerId', String(viewOwner));
    reply.header('HX-Redirect', `/wardrobe/${id}?${params}`);
    return reply.send();
  }

  @Post(':id/archive')
  async archive(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query('ownerId') ownerId: string | undefined,
  ) {
    const userId = this.userId(req);
    const viewOwner = ownerId ? parseInt(ownerId, 10) : undefined;

    // Archive/unarchive is only allowed for the owner
    if (viewOwner != null && viewOwner !== userId) {
      throw new ForbiddenException();
    }

    await this.garmentService.archive(id, userId);
    const redirectSuffix = viewOwner ? `?ownerId=${viewOwner}` : '';
    reply.header('HX-Redirect', `/wardrobe${redirectSuffix}`);
    return reply.send();
  }

  @Post(':id/nobg')
  async updateNobg(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query('ownerId') ownerId: string | undefined,
  ) {
    const userId = this.userId(req);
    const viewOwner = ownerId ? parseInt(ownerId, 10) : undefined;

    if (userId != null && viewOwner != null && viewOwner !== userId) {
      const canManage = await this.shareService.canManage(userId, viewOwner);
      if (!canManage) throw new ForbiddenException();
    }

    const nobgPhoto = await req.file();
    await this.garmentService.updateNobg(
      id,
      nobgPhoto,
      viewOwner ?? userId,
      userId,
    );
    const redirectSuffix = viewOwner ? `?ownerId=${viewOwner}` : '';
    reply.header('HX-Redirect', `/wardrobe/${id}${redirectSuffix}`);
    return reply.send();
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query('ownerId') ownerId: string | undefined,
  ) {
    const userId = this.userId(req);
    const viewOwner = ownerId ? parseInt(ownerId, 10) : undefined;

    // Delete is only allowed for the owner
    if (viewOwner != null && viewOwner !== userId) {
      throw new ForbiddenException();
    }

    await this.garmentService.remove(id, userId);
    reply.header('HX-Redirect', '/wardrobe');
    return reply.send();
  }
}
