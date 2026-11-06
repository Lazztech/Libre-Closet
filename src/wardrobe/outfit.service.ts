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
import { GarmentService } from './garment.service';
import { CreateOutfitDto } from './dto/create-outfit.dto';
import { UpdateOutfitDto } from './dto/update-outfit.dto';

import {
  CATEGORY_SORT_ORDER,
  compareCategories,
} from './garment-category.enum';

export { CATEGORY_SORT_ORDER };
export const CATEGORY_ANATOMICAL_ORDER: readonly string[] = CATEGORY_SORT_ORDER;

export function orderOutfitGarments(outfit: Outfit): Garment[] {
  const garments = outfit.garments?.getItems
    ? outfit.garments.getItems()
    : (outfit.garments as any) || [];
  if (!garments.length) return [];

  // If slots are defined with garment selections, respect the user's custom preference
  if (outfit.slots?.length) {
    const garmentMap = new Map<number, Garment>();
    for (const g of garments) {
      garmentMap.set(g.id, g);
    }

    const ordered: Garment[] = [];
    const seenIds = new Set<number>();

    for (const slot of outfit.slots) {
      if (
        slot.garmentId != null &&
        garmentMap.has(slot.garmentId) &&
        !seenIds.has(slot.garmentId)
      ) {
        ordered.push(garmentMap.get(slot.garmentId)!);
        seenIds.add(slot.garmentId);
      }
    }

    // Any remaining garments in the outfit not specified in slots fall back to default category priority
    const remaining = garments.filter((g) => !seenIds.has(g.id));
    if (remaining.length > 0) {
      remaining.sort((a, b) => compareCategories(a.category, b.category, 1));
      ordered.push(...remaining);
    }

    return ordered;
  }

  // Default: order garments by CATEGORY_SORT_ORDER (wear priority)
  return [...garments].sort((a, b) =>
    compareCategories(a.category, b.category, 1),
  );
}

export const DEFAULT_OUTFIT_BUILDER_CATEGORIES: string[] = [
  'tops',
  'bottoms',
  'outerwear',
  'footwear',
];

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

  getOrderedGarments(outfit: Outfit): Garment[] {
    return orderOutfitGarments(outfit);
  }

  async findAll(userId?: number): Promise<Outfit[]> {
    const where = userId != null ? { owner: { id: userId } } : { owner: null };
    const outfits = await this.outfitRepository.find(where, {
      populate: ['garments', 'garments.photo'],
    });
    for (const outfit of outfits) {
      (outfit as any).garments = this.getOrderedGarments(outfit);
    }
    return outfits;
  }

  async findPaginated(
    userId?: number,
    limit = 50,
    offset = 0,
  ): Promise<{ outfits: Outfit[]; total: number; hasMore: boolean }> {
    const where = userId != null ? { owner: { id: userId } } : { owner: null };
    const [outfits, total] = await this.outfitRepository.findAndCount(where, {
      populate: ['garments', 'garments.photo'],
      orderBy: { id: 'desc' },
      limit,
      offset,
    });
    for (const outfit of outfits) {
      (outfit as any).garments = this.getOrderedGarments(outfit);
    }
    return {
      outfits,
      total,
      hasMore: offset + outfits.length < total,
    };
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
      rating: dto.rating,
      slots: dto.slots,
      look: dto.look,
      occasions: dto.occasions,
      seasons: dto.seasons,
      createdAt: new Date(),
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
      rating: dto.rating !== undefined ? (dto.rating as any) : outfit.rating,
      slots: dto.slots ?? outfit.slots,
      look: dto.look !== undefined ? dto.look : outfit.look,
      occasions: dto.occasions !== undefined ? dto.occasions : outfit.occasions,
      seasons: dto.seasons !== undefined ? dto.seasons : outfit.seasons,
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
    defaultOnly = false,
  ) {
    const grouped: Partial<Record<string, Garment[]>> = {};
    for (const g of garments) {
      (grouped[g.category] ??= []).push(g);
    }

    const toRow = (
      category: string,
      items: Garment[],
      selectedId: number | null,
      defaultFirst = false,
    ) => {
      const selectedIdx =
        selectedId != null ? items.findIndex((g) => g.id === selectedId) : -1;
      let idx = 0;
      if (selectedIdx >= 0) {
        idx = selectedIdx + 1;
      } else if (defaultFirst && items.length > 0) {
        idx = 1;
      }
      return this.buildRow(category, items, idx, i18n);
    };

    const sortCategories = (cats: string[]) => {
      return [...cats].sort((a, b) => compareCategories(a, b, 1));
    };

    // Slot-based path: preserves saved order and duplicate categories
    if (slots?.length) {
      const rows = slots
        .filter((slot) => grouped[slot.category]?.length)
        .map((slot) => {
          const items = grouped[slot.category]!;
          const selected =
            slot.garmentId != null
              ? (items.find((g) => g.id === slot.garmentId) ?? null)
              : null;
          return toRow(slot.category, items, selected?.id ?? null, false);
        });

      // If any selected garments were not included in slots, append them sorted by category order
      const handledGarmentIds = new Set(
        slots.map((s) => s.garmentId).filter((id): id is number => id != null),
      );
      const missingGarmentCats = new Set<string>();
      for (const id of selectedIds) {
        if (!handledGarmentIds.has(id)) {
          const g = garments.find((item) => item.id === id);
          if (g && grouped[g.category]?.length) {
            missingGarmentCats.add(g.category);
          }
        }
      }
      if (missingGarmentCats.size > 0) {
        const sortedMissing = sortCategories(Array.from(missingGarmentCats));
        for (const cat of sortedMissing) {
          const items = grouped[cat]!;
          const selected =
            items.find((g) => selectedIds.includes(g.id)) ?? null;
          rows.push(toRow(cat, items, selected?.id ?? null, false));
        }
      }

      return rows;
    }

    let orderedKeys: string[];
    if (defaultOnly) {
      orderedKeys = DEFAULT_OUTFIT_BUILDER_CATEGORIES.filter(
        (c) => grouped[c]?.length,
      );
      if (orderedKeys.length === 0) {
        orderedKeys = sortCategories(
          Object.keys(grouped).filter((c) => grouped[c]?.length),
        );
      }
    } else if (selectedIds.length > 0) {
      const selectedCats = new Set<string>(
        garments
          .filter((g) => selectedIds.includes(g.id))
          .map((g) => g.category),
      );
      for (const cat of DEFAULT_OUTFIT_BUILDER_CATEGORIES) {
        if (grouped[cat]?.length) {
          selectedCats.add(cat);
        }
      }
      orderedKeys = sortCategories(Array.from(selectedCats));
    } else {
      orderedKeys = sortCategories(
        Object.keys(grouped).filter((c) => grouped[c]?.length),
      );
    }

    return orderedKeys.map((cat) => {
      const items = grouped[cat]!;
      const selected = items.find((g) => selectedIds.includes(g.id)) ?? null;
      return toRow(cat, items, selected?.id ?? null, true);
    });
  }

  buildRow(
    category: string,
    items: Garment[],
    idx: number,
    i18n: I18nContext,
    rowId?: string,
  ) {
    const count = items.length;
    const sel = idx > 0 ? (items[idx - 1] ?? null) : null;
    const uniqueRowId =
      rowId ||
      `outfit-row-${category}-${Math.random().toString(36).substring(2, 7)}`;
    return {
      rowId: uniqueRowId,
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
