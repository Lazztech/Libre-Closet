import { EntityRepository, wrap } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { I18nContext } from 'nestjs-i18n';
import { Garment } from '../dal/entity/garment.entity';
import { Outfit, OutfitSlot } from '../dal/entity/outfit.entity';
import { User } from '../dal/entity/user.entity';
import { GarmentCategory } from './garment-category.enum';
import { GarmentService } from './garment.service';

export interface CreateOutfitDto {
  name: string;
  notes?: string;
  slots?: OutfitSlot[];
}

export interface UpdateOutfitDto {
  name?: string;
  notes?: string;
  slots?: OutfitSlot[];
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
    private readonly garmentService: GarmentService,
  ) {}

  async findAll(userId?: number): Promise<Outfit[]> {
    if (userId != null) {
      return this.outfitRepository.find(
        { owner: { id: userId } },
        { populate: ['garments', 'garments.photo'] },
      );
    }
    // AUTH_ENABLED=false: only return outfits that belong to no user
    return this.outfitRepository.find(
      { owner: null },
      { populate: ['garments', 'garments.photo'] },
    );
  }

  async findOne(id: number, userId?: number): Promise<Outfit> {
    const outfit = await this.outfitRepository.findOne(id, {
      populate: ['garments', 'garments.photo'],
    });
    if (!outfit) throw new NotFoundException('Outfit not found');
    if (userId != null) {
      // auth mode: must be the owner
      if (outfit.owner?.id !== userId) throw new ForbiddenException();
    } else {
      // no-auth mode: only allow ownerless outfits
      if (outfit.owner != null) throw new ForbiddenException();
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
      slots: dto.slots,
    });

    const garmentIds =
      dto.slots
        ?.map((s) => s.garmentId)
        .filter((id): id is number => id !== null) ?? [];

    if (garmentIds.length) {
      const garments = await this.garmentRepository.find({
        id: { $in: garmentIds },
      });
      outfit.garments.set(garments);
    }

    if (userId != null) {
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
      slots: dto.slots ?? outfit.slots,
    });

    if (dto.slots !== undefined) {
      const garmentIds = dto.slots
        .map((s) => s.garmentId)
        .filter((id): id is number => id !== null);
      const garments = await this.garmentRepository.find({
        id: { $in: garmentIds },
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

  parseSlotsFromBody(
    category: string | string[] | undefined,
    garmentId: string | string[] | undefined,
  ): OutfitSlot[] {
    const cats = Array.isArray(category)
      ? category
      : category
        ? [category]
        : [];
    const ids = Array.isArray(garmentId)
      ? garmentId
      : garmentId
        ? [garmentId]
        : [];
    return cats.map((cat, i) => ({
      category: cat,
      garmentId: ids[i] ? Number(ids[i]) : null,
    }));
  }

  buildCategoryRows(
    garments: Garment[],
    selectedIds: number[],
    i18n: I18nContext,
    slots?: OutfitSlot[],
  ) {
    const grouped: Partial<Record<string, Garment[]>> = {};
    for (const g of garments) {
      (grouped[g.category] ??= []).push(g);
    }

    const toRow = (
      category: string,
      items: Garment[],
      selectedId: number | null,
    ) => {
      const selectedIdx =
        selectedId != null ? items.findIndex((g) => g.id === selectedId) : -1;
      const idx = selectedIdx >= 0 ? selectedIdx + 1 : 0;
      return this.buildRow(category, items, idx, i18n);
    };

    // Slot-based path: preserves saved order and duplicate categories
    if (slots?.length) {
      return slots
        .filter((slot) => grouped[slot.category]?.length)
        .map((slot) => {
          const items = grouped[slot.category]!;
          const selected =
            slot.garmentId != null
              ? (items.find((g) => g.id === slot.garmentId) ?? null)
              : null;
          return toRow(slot.category, items, selected?.id ?? null);
        });
    }

    // Fallback: enum order, one row per category with garments
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
      const selected = items.find((g) => selectedIds.includes(g.id)) ?? null;
      return toRow(cat, items, selected?.id ?? null);
    });
  }

  buildRow(category: string, items: Garment[], idx: number, i18n: I18nContext) {
    const count = items.length;
    const sel = idx > 0 ? (items[idx - 1] ?? null) : null;
    return {
      value: category,
      label: this.garmentService.resolveCategoryLabel(category, i18n),
      garmentCount: count,
      currentIndex: idx,
      prevIndex: idx === 0 ? count : idx - 1,
      nextIndex: idx === count ? 0 : idx + 1,
      currentGarment: sel
        ? {
            id: sel.id,
            name: sel.name,
            photo: sel.photo ? `/file/nobg/${sel.photo.fileName}` : null,
            brand: sel.brand ?? null,
            color: sel.color ?? null,
            size: sel.size ?? null,
            notes: sel.notes ?? null,
          }
        : null,
      garmentId: sel?.id ?? null,
    };
  }
}
