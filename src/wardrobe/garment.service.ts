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
import { Garment, GarmentCategory } from '../dal/entity/garment.entity';
import { File } from '../dal/entity/file.entity';
import { User } from '../dal/entity/user.entity';
import { FileService } from '../file/file-service.abstract';

export interface CreateGarmentDto {
  name: string;
  category: GarmentCategory;
  brand?: string;
  colors?: string[];
  size?: string;
  notes?: string;
  photo$?: Observable<MultipartFileStream>;
}

export interface UpdateGarmentDto {
  name?: string;
  category?: GarmentCategory;
  brand?: string;
  colors?: string[];
  size?: string;
  notes?: string;
  photo$?: Observable<MultipartFileStream>;
}

export interface SearchGarmentDto {
  keyword?: string;
  category?: GarmentCategory;
  color?: string;
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
    const searchConditions: FilterQuery<Garment> = {
      ...(dto.category ? { category: dto.category } : {}),
      ...(dto.keyword
        ? {
            $or: [
              { name: { $like: `%${dto.keyword}%` } },
              { notes: { $like: `%${dto.keyword}%` } },
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
      colors: dto.colors,
      size: dto.size,
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
    colors: string[];
    brands: string[];
    sizes: string[];
  }> {
    const where = userId != null ? { owner: { id: userId } } : { owner: null };
    const garments = await this.garmentRepository.find(where);

    const colors = [...new Set(garments.flatMap((g) => g.colors ?? []))].sort();
    const brands = [
      ...new Set(garments.map((g) => g.brand).filter(Boolean) as string[]),
    ].sort();
    const sizes = [
      ...new Set(garments.map((g) => g.size).filter(Boolean) as string[]),
    ].sort();

    return { colors, brands, sizes };
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
    garment.colors = dto.colors ?? garment.colors;
    garment.size = dto.size ?? garment.size;
    garment.notes = dto.notes ?? garment.notes;

    await this.garmentRepository.getEntityManager().flush();
    return garment;
  }

  async remove(id: number, userId?: number): Promise<void> {
    const garment = await this.findOne(id, userId);
    await this.garmentRepository.getEntityManager().removeAndFlush(garment);
  }
}
