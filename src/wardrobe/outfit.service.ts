import { EntityRepository, wrap } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Garment } from '../dal/entity/garment.entity';
import { Outfit } from '../dal/entity/outfit.entity';
import { User } from '../dal/entity/user.entity';

export interface CreateOutfitDto {
  name: string;
  notes?: string;
  garmentIds?: number[];
}

export interface UpdateOutfitDto {
  name?: string;
  notes?: string;
  garmentIds?: number[];
}

@Injectable()
export class OutfitService {
  private readonly logger = new Logger(OutfitService.name);

  constructor(
    @InjectRepository(Outfit)
    private readonly outfitRepository: EntityRepository<Outfit>,
    @InjectRepository(Garment)
    private readonly garmentRepository: EntityRepository<Garment>,
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
    private readonly configService: ConfigService,
  ) {}

  private get authEnabled(): boolean {
    return this.configService.get<boolean>('AUTH_ENABLED') ?? false;
  }

  async findAll(userId?: number): Promise<Outfit[]> {
    if (this.authEnabled && userId != null) {
      return this.outfitRepository.find(
        { owner: { id: userId } },
        { populate: ['garments', 'garments.photo'] },
      );
    }
    return this.outfitRepository.findAll({
      populate: ['garments', 'garments.photo'],
    });
  }

  async findOne(id: number, userId?: number): Promise<Outfit> {
    const outfit = await this.outfitRepository.findOne(id, {
      populate: ['garments', 'garments.photo'],
    });
    if (!outfit) throw new NotFoundException('Outfit not found');
    if (this.authEnabled && userId != null) {
      if (outfit.owner?.id !== userId) {
        throw new ForbiddenException();
      }
    }
    return outfit;
  }

  async findOneByShareableId(shareableId: string): Promise<Outfit> {
    const outfit = await this.outfitRepository.findOne(
      { shareableId },
      { populate: ['garments', 'garments.photo'] },
    );
    if (!outfit) throw new NotFoundException('Outfit not found');
    return outfit;
  }

  async create(dto: CreateOutfitDto, userId?: number): Promise<Outfit> {
    const outfit = this.outfitRepository.create({
      name: dto.name,
      notes: dto.notes,
    });

    if (dto.garmentIds?.length) {
      const garments = await this.garmentRepository.find({
        id: { $in: dto.garmentIds },
      });
      outfit.garments.set(garments);
    }

    if (this.authEnabled && userId != null) {
      const user = await this.userRepository.findOneOrFail(userId);
      outfit.owner = user as any;
    }

    await this.outfitRepository.getEntityManager().persistAndFlush(outfit);
    return outfit;
  }

  async update(
    id: number,
    dto: UpdateOutfitDto,
    userId?: number,
  ): Promise<Outfit> {
    const outfit = await this.findOne(id, userId);

    wrap(outfit).assign({
      name: dto.name ?? outfit.name,
      notes: dto.notes ?? outfit.notes,
    });

    if (dto.garmentIds !== undefined) {
      const garments = await this.garmentRepository.find({
        id: { $in: dto.garmentIds },
      });
      outfit.garments.set(garments);
    }

    await this.outfitRepository.getEntityManager().flush();
    return outfit;
  }

  async remove(id: number, userId?: number): Promise<void> {
    const outfit = await this.findOne(id, userId);
    await this.outfitRepository.getEntityManager().removeAndFlush(outfit);
  }
}
