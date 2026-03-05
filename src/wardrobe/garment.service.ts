import { EntityRepository, FilterQuery } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { MultipartFileStream } from '@proventuslabs/nestjs-multipart-form';
import {
  Garment,
  GarmentCategory,
  GarmentColor,
} from '../dal/entity/garment.entity';
import { File } from '../dal/entity/file.entity';
import { User } from '../dal/entity/user.entity';
import { FileService } from '../file/file-service.abstract';

export const CANONICAL_SIZES = [
  'XX-Small',
  'X-Small',
  'Small',
  'Medium',
  'Large',
  'X-Large',
  'XX-Large',
  'XXX-Large',
  'XXXX-Large',
  'XXXXX-Large',
];

export function normalizeSize(input?: string): string | undefined {
  if (!input) return undefined;
  const s = input
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '');
  if (['xxxxxl', '5xl', '5xlarge', 'xxxxxlarge'].includes(s)) return '5X-Large';
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

export interface CreateGarmentDto {
  name: string;
  category: GarmentCategory;
  brand?: string;
  color?: GarmentColor;
  size?: string;
  notes?: string;
  photo$?: Observable<MultipartFileStream>;
}

export interface UpdateGarmentDto {
  name?: string;
  category?: GarmentCategory;
  brand?: string;
  color?: GarmentColor;
  size?: string;
  notes?: string;
  photo$?: Observable<MultipartFileStream>;
}

export interface SearchGarmentDto {
  keyword?: string;
  category?: GarmentCategory;
  color?: GarmentColor;
  brand?: string;
  size?: string;
}

@Injectable()
export class GarmentService {
  private readonly logger = new Logger(GarmentService.name);

  constructor(
    @InjectRepository(Garment)
    private readonly garmentRepository: EntityRepository<Garment>,
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
    private readonly fileService: FileService,
  ) {}

  async findAll(
    userId?: number,
    dto: SearchGarmentDto = {},
  ): Promise<Garment[]> {
    const normalizedSize = normalizeSize(dto.size);
    const searchConditions: FilterQuery<Garment> = {
      ...(dto.category ? { category: dto.category } : {}),
      ...(dto.color ? { color: dto.color } : {}),
      ...(normalizedSize ? { size: normalizedSize } : {}),
      ...(dto.keyword
        ? {
            $or: [
              { name: { $like: `%${dto.keyword}%` } },
              { notes: { $like: `%${dto.keyword}%` } },
              { brand: { $like: `%${dto.keyword}%` } },
            ],
          }
        : {}),
    };
    if (userId != null) {
      return this.garmentRepository.find(
        { owner: { id: userId }, ...searchConditions },
        { populate: ['photo'] },
      );
    }
    // AUTH_ENABLED=false: only return garments that belong to no user
    return this.garmentRepository.find(
      { owner: null, ...searchConditions },
      { populate: ['photo'] },
    );
  }

  async findOne(id: number, userId?: number): Promise<Garment> {
    const garment = await this.garmentRepository.findOne(id, {
      populate: ['photo', 'outfits'],
    });
    if (!garment) throw new NotFoundException('Garment not found');
    if (userId != null) {
      // auth mode: must be the owner
      if (garment.owner?.id !== userId) throw new ForbiddenException();
    } else {
      // no-auth mode: only allow ownerless garments
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
    if (dto.photo$) {
      photo = await this.fileService.storeImageFromFileUpload(
        dto.photo$,
        userId,
      );
    }

    const garment = this.garmentRepository.create({
      name: dto.name,
      category: dto.category,
      brand: dto.brand,
      color: dto.color,
      size: normalizeSize(dto.size),
      notes: dto.notes,
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

    return { brands, sizes };
  }

  async update(
    id: number,
    dto: UpdateGarmentDto,
    userId?: number,
  ): Promise<Garment> {
    const garment = await this.findOne(id, userId);

    if (dto.photo$) {
      const photo = await this.fileService.storeImageFromFileUpload(
        dto.photo$,
        userId,
      );
      garment.photo = photo as any;
    }

    garment.name = dto.name ?? garment.name;
    garment.category = dto.category ?? garment.category;
    garment.brand = dto.brand ?? garment.brand;
    garment.color = dto.color ?? garment.color;
    garment.size = normalizeSize(dto.size) ?? garment.size;
    garment.notes = dto.notes ?? garment.notes;

    await this.garmentRepository.getEntityManager().flush();
    return garment;
  }

  async remove(id: number, userId?: number): Promise<void> {
    const garment = await this.findOne(id, userId);
    await this.garmentRepository.getEntityManager().removeAndFlush(garment);
  }
}
