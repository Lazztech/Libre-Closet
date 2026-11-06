import { EntityRepository, FilterQuery } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { randomUUID } from 'node:crypto';
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { I18nContext } from 'nestjs-i18n';
import { Garment } from '../dal/entity/garment.entity';
import { Outfit } from '../dal/entity/outfit.entity';
import { File } from '../dal/entity/file.entity';
import { User } from '../dal/entity/user.entity';
import { OutfitCalendar } from '../dal/entity/outfit-calendar.entity';
import { FileService } from '../file/file-service.abstract';
import { MultipartFile } from '@fastify/multipart';
import { CreateGarmentDto } from './dto/create-garment.dto';
import { UpdateGarmentDto } from './dto/update-garment.dto';
import { SearchGarmentDto } from './dto/search-garment.dto';
import { GarmentCategory, compareCategories } from './garment-category.enum';
import { WardrobeShareService } from '../wardrobe-share/wardrobe-share.service';
import { orderOutfitGarments } from './outfit.service';
import {
  normalizeSubCategory,
  compareSubCategories,
} from './additional-properties';

const CANONICAL_SIZES = [
  'XX-Small',
  'X-Small',
  'Small',
  'Medium',
  'Large',
  'X-Large',
  'XX-Large',
  '3X-Large',
  '4X-Large',
  '5X-Large',
];

@Injectable()
export class GarmentService {
  private readonly logger = new Logger(GarmentService.name);

  constructor(
    @InjectRepository(Garment)
    private readonly garmentRepository: EntityRepository<Garment>,
    @InjectRepository(Outfit)
    private readonly outfitRepository: EntityRepository<Outfit>,
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
    @InjectRepository(OutfitCalendar)
    private readonly calendarRepository: EntityRepository<OutfitCalendar>,
    private readonly fileService: FileService,
    private readonly shareService: WardrobeShareService,
  ) {}

  resolveCategoryLabel(value: string, i18n: I18nContext): string {
    const normalized = value.toLowerCase();
    if ((Object.values(GarmentCategory) as string[]).includes(normalized)) {
      return i18n.t(`lang.CATEGORY_${normalized.toUpperCase()}`);
    }
    return value;
  }

  async findAll(
    userId?: number,
    dto: SearchGarmentDto = {},
    viewOwner?: number,
  ): Promise<Garment[]> {
    const normalizedSize = this.normalizeSize(dto.size);
    const parsedRating =
      dto.rating != null && dto.rating !== '' ? Number(dto.rating) : undefined;
    const targetSubCategory = dto.subCategory;
    const searchConditions: FilterQuery<Garment> = {
      ...(dto.category ? { category: dto.category } : {}),
      ...(targetSubCategory ? { subCategory: targetSubCategory } : {}),
      ...(dto.color ? { color: { $like: `%${dto.color}%` } } : {}),
      ...(normalizedSize ? { size: normalizedSize } : {}),
      ...(dto.archived !== 'true' ? { archived: false } : {}),
      ...(dto.season ? { seasons: { $like: `%${dto.season}%` } } : {}),
      ...(dto.occasion ? { occasions: { $like: `%${dto.occasion}%` } } : {}),
      ...(parsedRating != null ? { rating: { $gte: parsedRating } } : {}),
      ...(dto.keyword
        ? {
            $or: [
              { name: { $like: `%${dto.keyword}%` } },
              { notes: { $like: `%${dto.keyword}%` } },
              { brand: { $like: `%${dto.keyword}%` } },
              { print: { $like: `%${dto.keyword}%` } },
              { look: { $like: `%${dto.keyword}%` } },
              { subCategory: { $like: `%${dto.keyword}%` } },
            ],
          }
        : {}),
    };

    let garments: Garment[];
    if (userId != null) {
      if (viewOwner != null && viewOwner !== userId) {
        garments = await this.garmentRepository.find(
          { owner: { id: viewOwner }, ...searchConditions },
          { populate: ['photo'], orderBy: { id: 'DESC' } },
        );
      } else {
        garments = await this.garmentRepository.find(
          { owner: { id: userId }, ...searchConditions },
          { populate: ['photo'], orderBy: { id: 'DESC' } },
        );
      }
    } else {
      // AUTH_ENABLED=false: only return garments that belong to no user
      garments = await this.garmentRepository.find(
        { owner: null, ...searchConditions },
        { populate: ['photo'], orderBy: { id: 'DESC' } },
      );
    }

    return this.sortGarments(garments, dto.sortBy, dto.sortOrder);
  }

  sortGarments(
    garments: Garment[],
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
  ): Garment[] {
    if (!garments || garments.length <= 1) return garments ?? [];

    const defaultOrder =
      sortBy === 'rating' ||
      sortBy === 'recently_added' ||
      sortBy === 'dateAquired'
        ? 'desc'
        : 'asc';
    const order =
      sortOrder === 'desc' || sortOrder === 'asc' ? sortOrder : defaultOrder;
    const dir = order === 'desc' ? -1 : 1;

    const compareWithNulls = <T>(
      a: T | null | undefined,
      b: T | null | undefined,
      compareFn: (valA: T, valB: T) => number,
      direction: number,
    ): number => {
      const hasA = a != null && a !== '';
      const hasB = b != null && b !== '';
      if (!hasA && !hasB) return 0;
      if (!hasA) return 1; // null/empty items always placed at the end
      if (!hasB) return -1;
      return direction * compareFn(a, b);
    };

    const compareStrings = (
      a?: string | null,
      b?: string | null,
      direction = 1,
    ): number => {
      return compareWithNulls(
        a?.trim(),
        b?.trim(),
        (vA, vB) =>
          vA.localeCompare(vB, undefined, {
            sensitivity: 'base',
            numeric: true,
          }),
        direction,
      );
    };

    const compareNumbers = (
      a?: number | string | null,
      b?: number | string | null,
      direction = 1,
    ): number => {
      const numA = a != null && !isNaN(Number(a)) ? Number(a) : null;
      const numB = b != null && !isNaN(Number(b)) ? Number(b) : null;
      return compareWithNulls(numA, numB, (vA, vB) => vA - vB, direction);
    };

    const compareDates = (
      a?: Date | string | null,
      b?: Date | string | null,
      direction = 1,
    ): number => {
      const timeA = a ? new Date(a).getTime() : NaN;
      const timeB = b ? new Date(b).getTime() : NaN;
      const valA = !isNaN(timeA) ? timeA : null;
      const valB = !isNaN(timeB) ? timeB : null;
      return compareWithNulls(valA, valB, (vA, vB) => vA - vB, direction);
    };

    const compareSizes = (
      a?: string | null,
      b?: string | null,
      direction = 1,
    ): number => {
      return compareWithNulls(
        a?.trim(),
        b?.trim(),
        (vA, vB) => {
          const idxA = CANONICAL_SIZES.findIndex(
            (s) => s.toLowerCase() === vA.toLowerCase(),
          );
          const idxB = CANONICAL_SIZES.findIndex(
            (s) => s.toLowerCase() === vB.toLowerCase(),
          );
          if (idxA >= 0 && idxB >= 0) return idxA - idxB;
          if (idxA >= 0) return -1;
          if (idxB >= 0) return 1;
          return vA.localeCompare(vB, undefined, {
            sensitivity: 'base',
            numeric: true,
          });
        },
        direction,
      );
    };

    const list = [...garments];

    return list.sort((g1, g2) => {
      let res = 0;

      switch (sortBy) {
        case 'category':
          // 1. category, 2. subCategory, 3. color, 4. name, 5. id
          res = compareCategories(g1.category, g2.category, dir);
          if (res !== 0) return res;
          res = compareSubCategories(g1.subCategory, g2.subCategory, dir);
          if (res !== 0) return res;
          res = compareStrings(g1.color, g2.color, dir);
          if (res !== 0) return res;
          res = compareStrings(g1.name, g2.name, dir);
          if (res !== 0) return res;
          return (g2.id ?? 0) - (g1.id ?? 0);

        case 'subCategory':
          // 1. subCategory, 2. category, 3. color, 4. name, 5. id
          res = compareSubCategories(g1.subCategory, g2.subCategory, dir);
          if (res !== 0) return res;
          res = compareCategories(g1.category, g2.category, dir);
          if (res !== 0) return res;
          res = compareStrings(g1.color, g2.color, dir);
          if (res !== 0) return res;
          res = compareStrings(g1.name, g2.name, dir);
          if (res !== 0) return res;
          return (g2.id ?? 0) - (g1.id ?? 0);

        case 'name':
          // 1. name, 2. category, 3. subCategory, 4. id
          res = compareStrings(g1.name, g2.name, dir);
          if (res !== 0) return res;
          res = compareCategories(g1.category, g2.category, dir);
          if (res !== 0) return res;
          res = compareSubCategories(g1.subCategory, g2.subCategory, dir);
          if (res !== 0) return res;
          return (g2.id ?? 0) - (g1.id ?? 0);

        case 'rating':
          // 1. rating, 2. cost, 3. name, 4. id
          res = compareNumbers(g1.rating, g2.rating, dir);
          if (res !== 0) return res;
          res = compareNumbers(g1.cost, g2.cost, dir);
          if (res !== 0) return res;
          res = compareStrings(g1.name, g2.name, 1);
          if (res !== 0) return res;
          return (g2.id ?? 0) - (g1.id ?? 0);

        case 'cost':
          // 1. cost, 2. rating, 3. name, 4. id
          res = compareNumbers(g1.cost, g2.cost, dir);
          if (res !== 0) return res;
          res = compareNumbers(g1.rating, g2.rating, -1);
          if (res !== 0) return res;
          res = compareStrings(g1.name, g2.name, 1);
          if (res !== 0) return res;
          return (g2.id ?? 0) - (g1.id ?? 0);

        case 'brand':
          // 1. brand, 2. category, 3. name, 4. id
          res = compareStrings(g1.brand, g2.brand, dir);
          if (res !== 0) return res;
          res = compareCategories(g1.category, g2.category, dir);
          if (res !== 0) return res;
          res = compareStrings(g1.name, g2.name, dir);
          if (res !== 0) return res;
          return (g2.id ?? 0) - (g1.id ?? 0);

        case 'color':
          // 1. color, 2. category, 3. subCategory, 4. name, 5. id
          res = compareStrings(g1.color, g2.color, dir);
          if (res !== 0) return res;
          res = compareCategories(g1.category, g2.category, dir);
          if (res !== 0) return res;
          res = compareSubCategories(g1.subCategory, g2.subCategory, dir);
          if (res !== 0) return res;
          res = compareStrings(g1.name, g2.name, dir);
          if (res !== 0) return res;
          return (g2.id ?? 0) - (g1.id ?? 0);

        case 'size':
          // 1. size, 2. category, 3. name, 4. id
          res = compareSizes(g1.size, g2.size, dir);
          if (res !== 0) return res;
          res = compareCategories(g1.category, g2.category, dir);
          if (res !== 0) return res;
          res = compareStrings(g1.name, g2.name, dir);
          if (res !== 0) return res;
          return (g2.id ?? 0) - (g1.id ?? 0);

        case 'dateAquired':
          // 1. dateAquired, 2. name, 3. id
          res = compareDates(g1.dateAquired, g2.dateAquired, dir);
          if (res !== 0) return res;
          res = compareStrings(g1.name, g2.name, 1);
          if (res !== 0) return res;
          return (g2.id ?? 0) - (g1.id ?? 0);

        case 'season':
        case 'seasons':
          // 1. seasons, 2. category, 3. name, 4. id
          res = compareStrings(g1.seasons, g2.seasons, dir);
          if (res !== 0) return res;
          res = compareCategories(g1.category, g2.category, dir);
          if (res !== 0) return res;
          res = compareStrings(g1.name, g2.name, dir);
          if (res !== 0) return res;
          return (g2.id ?? 0) - (g1.id ?? 0);

        case 'occasion':
        case 'occasions':
          // 1. occasions, 2. category, 3. name, 4. id
          res = compareStrings(g1.occasions, g2.occasions, dir);
          if (res !== 0) return res;
          res = compareCategories(g1.category, g2.category, dir);
          if (res !== 0) return res;
          res = compareStrings(g1.name, g2.name, dir);
          if (res !== 0) return res;
          return (g2.id ?? 0) - (g1.id ?? 0);

        case 'print':
          // 1. print, 2. category, 3. name, 4. id
          res = compareStrings(g1.print, g2.print, dir);
          if (res !== 0) return res;
          res = compareCategories(g1.category, g2.category, dir);
          if (res !== 0) return res;
          res = compareStrings(g1.name, g2.name, dir);
          if (res !== 0) return res;
          return (g2.id ?? 0) - (g1.id ?? 0);

        case 'look':
          // 1. look, 2. category, 3. name, 4. id
          res = compareStrings(g1.look, g2.look, dir);
          if (res !== 0) return res;
          res = compareCategories(g1.category, g2.category, dir);
          if (res !== 0) return res;
          res = compareStrings(g1.name, g2.name, dir);
          if (res !== 0) return res;
          return (g2.id ?? 0) - (g1.id ?? 0);

        case 'fit':
          // 1. fit, 2. category, 3. name, 4. id
          res = compareStrings(g1.fit, g2.fit, dir);
          if (res !== 0) return res;
          res = compareCategories(g1.category, g2.category, dir);
          if (res !== 0) return res;
          res = compareStrings(g1.name, g2.name, dir);
          if (res !== 0) return res;
          return (g2.id ?? 0) - (g1.id ?? 0);

        case 'recently_added':
        case 'id':
        default:
          return dir * ((g1.id ?? 0) - (g2.id ?? 0));
      }
    });
  }

  async findOne(
    id: number,
    userId?: number,
    viewOwner?: number,
  ): Promise<Garment> {
    const garment = await this.garmentRepository.findOne(id, {
      populate: ['photo', 'outfits'],
    });
    if (!garment) throw new NotFoundException('Garment not found');
    if (userId != null) {
      if (garment.owner?.id === userId) return garment;
      if (viewOwner != null && garment.owner?.id === viewOwner) {
        if (await this.shareService.canView(userId, viewOwner)) {
          return garment;
        }
      }
      throw new ForbiddenException();
    } else {
      if (garment.owner != null) throw new ForbiddenException();
    }
    return garment;
  }

  async findOneByShareableId(shareableId: string): Promise<Garment> {
    const garment = await this.garmentRepository.findOne(
      { shareableId },
      { populate: ['photo'] },
    );
    if (!garment) throw new NotFoundException('Garment not found');
    return garment;
  }

  async create(dto: CreateGarmentDto, userId?: number): Promise<Garment> {
    let photo: File | undefined = undefined;
    if (dto.files) {
      for await (const file of dto.files) {
        if (file.fieldname === 'photo') {
          photo = await this.fileService.storeImageFromFileUpload(file, userId);
        } else {
          file.file.resume();
        }
      }
    }

    const subCategory = normalizeSubCategory(dto.category, dto.subCategory);

    const garment = this.garmentRepository.create({
      name: dto.name,
      category: dto.category,
      subCategory,
      brand: dto.brand,
      color: dto.color,
      size: this.normalizeSize(dto.size),
      notes: dto.notes,
      washingDetails: dto.washingDetails,
      dateAquired: dto.dateAquired ? new Date(dto.dateAquired) : undefined,
      photo: photo ?? undefined,
      rating: dto.rating,
      seasons: dto.seasons,
      occasions: dto.occasions,
      purchaseLink: dto.purchaseLink,
      cost: dto.cost,
      print: dto.print ?? dto.pattern,
      look: dto.look ?? dto.style,
      fit: dto.fit,
    });

    if (userId != null) {
      const user = await this.userRepository.findOneOrFail(userId);
      garment.owner = user as any;
    }

    await this.garmentRepository.getEntityManager().persistAndFlush(garment);
    return garment;
  }

  async clone(
    sourceId: number,
    dto: Partial<CreateGarmentDto> & {
      category: string;
    },
    userId?: number,
  ): Promise<Garment> {
    const source = await this.garmentRepository.findOne(sourceId, {
      populate: ['photo'],
    });
    if (!source) throw new NotFoundException('Garment not found');

    let photo: File | undefined;
    if (source.photo?.fileName) {
      photo = await this.fileService.copyImage(source.photo.fileName, userId);
      if (photo) {
        const nobgSourceName = this.fileService.nobgFileName(
          source.photo.fileName,
        );
        const nobgStream = await this.fileService
          .get(nobgSourceName)
          .catch(() => undefined);
        if (nobgStream) {
          await this.fileService
            .storeNobgVariantFromStream(nobgStream, photo.fileName)
            .catch((err) => this.logger.warn(err));
        }
      }
    }

    const subCategory =
      dto.subCategory !== undefined
        ? normalizeSubCategory(dto.category, dto.subCategory)
        : source.subCategory;

    const garment = this.garmentRepository.create({
      name: dto.name,
      category: dto.category,
      subCategory,
      brand: dto.brand,
      color: dto.color,
      size: this.normalizeSize(dto.size),
      notes: dto.notes,
      washingDetails: dto.washingDetails ?? source.washingDetails,
      dateAquired: dto.dateAquired
        ? new Date(dto.dateAquired)
        : source.dateAquired,
      rating: dto.rating ?? source.rating,
      seasons: dto.seasons ?? source.seasons,
      occasions: dto.occasions ?? source.occasions,
      purchaseLink: dto.purchaseLink ?? source.purchaseLink,
      cost: dto.cost ?? source.cost,
      print: dto.print ?? dto.pattern ?? source.print,
      look: dto.look ?? dto.style ?? source.look,
      fit: dto.fit ?? source.fit,
      photo: photo ?? undefined,
    });

    if (userId != null) {
      const user = await this.userRepository.findOneOrFail(userId);
      garment.owner = user as any;
    }

    await this.garmentRepository.getEntityManager().persistAndFlush(garment);
    return garment;
  }

  async findAvailableFilters(userId?: number): Promise<{
    brands: string[];
    sizes: string[];
    categories: string[];
  }> {
    const where = userId != null ? { owner: { id: userId } } : { owner: null };
    const garments = await this.garmentRepository.find(where);

    const brands = [
      ...new Set(garments.map((g) => g.brand).filter(Boolean) as string[]),
    ].sort();
    const allSizes = [
      ...new Set(garments.map((g) => g.size).filter(Boolean) as string[]),
    ];
    const sizes = allSizes.sort((a, b) => {
      const ai = CANONICAL_SIZES.indexOf(a);
      const bi = CANONICAL_SIZES.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

    const categories = [
      ...new Set(garments.map((g) => g.category).filter(Boolean)),
    ].sort();

    const subCategories = [
      ...new Set(
        garments.map((g) => g.subCategory).filter(Boolean) as string[],
      ),
    ].sort((a, b) => compareSubCategories(a, b, 1));

    return { brands, sizes, categories, subCategories };
  }

  async update(
    id: number,
    dto: UpdateGarmentDto,
    userId?: number,
    requestingUserId?: number,
  ): Promise<Garment> {
    let photo: File | undefined;
    if (dto.files) {
      // Process file uploads BEFORE any async DB operations.
      // @fastify/multipart yields live streams; if a stream isn't consumed,
      // the parser backpressures and the async iterator hangs. Each file's
      // pipeline must be started (not awaited) inside the loop so busboy can
      // advance to the next part.
      //
      // IMPORTANT: photo and nobgPhoto pipelines must be started concurrently,
      // not sequentially. Both come from the same multipart request body —
      // awaiting one before starting the other would hang the iterator.
      let photoPromise: Promise<File> | undefined;
      let nobgPromise: Promise<void> | undefined;
      const photoFileName = `${randomUUID()}.webp`;

      for await (const file of dto.files) {
        if (file.fieldname === 'photo') {
          photoPromise = this.fileService.storeImageFromFileUpload(
            file,
            userId,
            photoFileName,
          );
        } else if (file.fieldname === 'nobgPhoto') {
          nobgPromise = this.fileService.storeNobgVariantFromStream(
            file.file,
            photoFileName,
          );
        } else {
          file.file.resume();
        }
      }

      if (photoPromise) {
        [photo] = await Promise.all([
          photoPromise,
          nobgPromise ?? Promise.resolve(),
        ]);
      }
    }

    const garment = await this.findOne(id, requestingUserId, userId);

    if (photo) {
      await this.deleteOldPhoto(garment);
      garment.photo = photo as any;
    }

    garment.name = dto.name ?? garment.name;
    garment.category = dto.category ?? garment.category;
    if ('subCategory' in dto) {
      garment.subCategory = normalizeSubCategory(
        garment.category,
        dto.subCategory,
      );
    } else if (dto.category && dto.category !== garment.category) {
      garment.subCategory = normalizeSubCategory(
        garment.category,
        garment.subCategory,
      );
    }
    if ('brand' in dto) garment.brand = dto.brand;
    if ('color' in dto) garment.color = dto.color;
    if ('size' in dto) garment.size = this.normalizeSize(dto.size);
    if ('notes' in dto) garment.notes = dto.notes;
    if ('washingDetails' in dto) garment.washingDetails = dto.washingDetails;
    if ('dateAquired' in dto)
      garment.dateAquired = dto.dateAquired
        ? new Date(dto.dateAquired)
        : undefined;
    if ('rating' in dto) garment.rating = dto.rating;
    if ('seasons' in dto) garment.seasons = dto.seasons;
    if ('occasions' in dto) garment.occasions = dto.occasions;
    if ('purchaseLink' in dto) garment.purchaseLink = dto.purchaseLink;
    if ('cost' in dto) garment.cost = dto.cost;
    if ('print' in dto) garment.print = dto.print;
    else if ('pattern' in dto) garment.print = dto.pattern;
    if ('look' in dto) garment.look = dto.look;
    else if ('style' in dto) garment.look = dto.style;
    if ('fit' in dto) garment.fit = dto.fit;

    await this.garmentRepository.getEntityManager().flush();
    return garment;
  }

  private async deleteOldPhoto(garment: Garment) {
    const oldFileName = garment.photo?.fileName;
    if (oldFileName) {
      await this.fileService
        .delete(oldFileName)
        .catch((err) => this.logger.warn(err));
      const nobgFileName = this.fileService.nobgFileName(oldFileName);
      await this.fileService
        .delete(nobgFileName)
        .catch((err) => this.logger.warn(err));
    }
  }

  async updateNobg(
    id: number,
    nobgPhoto: MultipartFile | undefined,
    userId?: number,
    requestingUserId?: number,
  ): Promise<void> {
    const garment = await this.findOne(id, requestingUserId, userId);
    if (!garment.photo?.fileName) return;
    await this.streamNobgIfPresent(nobgPhoto, garment.photo.fileName);
  }

  private streamNobgIfPresent(
    nobgPhoto: MultipartFile | undefined,
    photoFileName: string,
  ): Promise<void> {
    if (!nobgPhoto) return Promise.resolve();
    const fileStream = nobgPhoto.file;
    return this.fileService.storeNobgVariantFromStream(
      fileStream,
      photoFileName,
    );
  }

  async getWearsCount(garmentId: number, userId?: number): Promise<number> {
    const qb = this.calendarRepository.createQueryBuilder('c');
    qb.join('c.outfit', 'o')
      .join('o.garments', 'g')
      .where({
        'g.id': garmentId,
        'c.wornAt': { $ne: null },
      });
    if (userId != null) {
      qb.andWhere({ 'c.owner': userId });
    } else {
      qb.andWhere({ 'c.owner': null });
    }
    return await qb.getCount();
  }

  async findGarmentOutfitsWithWearHistory(
    garmentId: number,
    userId?: number,
    viewOwner?: number,
    sort: 'asc' | 'desc' = 'desc',
  ): Promise<{
    garment: Garment;
    outfits: Array<{
      id: number;
      name?: string;
      rating?: number;
      notes?: string;
      look?: string;
      occasions?: string;
      seasons?: string;
      createdAt?: Date;
      createdAtStr: string;
      garments: Garment[];
      wornDates: Array<{ date: Date; dateStr: string }>;
      isWorn: boolean;
    }>;
  }> {
    const garment = await this.findOne(garmentId, userId, viewOwner);
    const effectiveOwnerId = viewOwner ?? userId;

    const where: FilterQuery<Outfit> = {
      garments: { id: garment.id },
      ...(effectiveOwnerId != null
        ? { owner: { id: effectiveOwnerId } }
        : { owner: null }),
    };

    const outfits = await this.outfitRepository.find(where, {
      populate: ['garments', 'garments.photo'],
    });

    outfits.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeA !== timeB) {
        return sort === 'asc' ? timeA - timeB : timeB - timeA;
      }
      return sort === 'asc' ? a.id - b.id : b.id - a.id;
    });

    const wornDatesByOutfitId = new Map<
      number,
      Array<{ date: Date; dateStr: string }>
    >();

    if (outfits.length > 0) {
      const outfitIds = outfits.map((o) => o.id);
      const calendarWhere: FilterQuery<OutfitCalendar> = {
        outfit: { id: { $in: outfitIds } },
        wornAt: { $ne: null },
        ...(effectiveOwnerId != null
          ? { owner: { id: effectiveOwnerId } }
          : { owner: null }),
      };

      const entries = await this.calendarRepository.find(calendarWhere, {
        orderBy: { date: 'desc' },
      });

      for (const entry of entries) {
        const oId = entry.outfit.id;
        if (!wornDatesByOutfitId.has(oId)) {
          wornDatesByOutfitId.set(oId, []);
        }
        const dateStr =
          entry.date instanceof Date
            ? entry.date.toISOString().split('T')[0]
            : String(entry.date).split('T')[0];

        const list = wornDatesByOutfitId.get(oId)!;
        if (!list.some((item) => item.dateStr === dateStr)) {
          list.push({ date: entry.date, dateStr });
        }
      }
    }

    const outfitItems = outfits.map((outfit) => {
      const orderedGarments = orderOutfitGarments(outfit);
      const wornDates = wornDatesByOutfitId.get(outfit.id) ?? [];
      const isWorn = wornDates.length > 0;
      const createdAtDate = outfit.createdAt ?? new Date();
      const createdAtStr =
        createdAtDate instanceof Date
          ? createdAtDate.toISOString().split('T')[0]
          : String(createdAtDate).split('T')[0];

      return {
        id: outfit.id,
        name: outfit.name,
        rating: outfit.rating,
        notes: outfit.notes,
        look: outfit.look,
        occasions: outfit.occasions,
        seasons: outfit.seasons,
        createdAt: outfit.createdAt,
        createdAtStr,
        garments: orderedGarments,
        wornDates,
        isWorn,
      };
    });

    return {
      garment,
      outfits: outfitItems,
    };
  }

  async remove(id: number, userId?: number): Promise<void> {
    const garment = await this.findOne(id, userId);
    await this.garmentRepository.getEntityManager().removeAndFlush(garment);
  }

  async archive(id: number, userId?: number): Promise<Garment> {
    const garment = await this.findOne(id, userId);
    garment.archived = !garment.archived;
    await this.garmentRepository.getEntityManager().flush();
    return garment;
  }

  private normalizeSize(input?: string): string | undefined {
    if (!input) return undefined;
    const s = input
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '');
    if (['xxxxxl', '5xl', '5xlarge', 'xxxxxlarge'].includes(s))
      return '5X-Large';
    if (['xxxxl', '4xl', '4xlarge', 'xxxxlarge'].includes(s)) return '4X-Large';
    if (['xxxl', '3xl', '3xlarge', 'xxxlarge'].includes(s)) return '3X-Large';
    if (['xxl', '2xl', '2xlarge', 'xxlarge'].includes(s)) return 'XX-Large';
    if (['xl', 'xlarge'].includes(s)) return 'X-Large';
    if (['l', 'large'].includes(s)) return 'Large';
    if (['m', 'medium'].includes(s)) return 'Medium';
    if (['s', 'small'].includes(s)) return 'Small';
    if (['xs', 'xsmall'].includes(s)) return 'X-Small';
    if (['xxs', '2xs', '2xsmall', 'xxsmall'].includes(s)) return 'XX-Small';
    return input.trim();
  }
}
