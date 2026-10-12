import { EntityRepository, wrap } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { I18nContext } from 'nestjs-i18n';
import { Garment } from '../dal/entity/garment.entity';
import { Outfit, OutfitSlot } from '../dal/entity/outfit.entity';
import { User } from '../dal/entity/user.entity';
import { GarmentCategory } from './garment-category.enum';
import { GarmentService } from './garment.service';
import { CreateOutfitDto } from './dto/create-outfit.dto';
import { UpdateOutfitDto } from './dto/update-outfit.dto';
import { getDefaultGarmentTransform } from './outfit-canvas.util';
import { CanvasSettingsService } from './canvas-settings.service';
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
    private readonly canvasSettingsService: CanvasSettingsService,
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
      outfit.slots = await this.applyGarmentCanvasDefaults(
        dto.slots ?? [],
        garments,
      );
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
      outfit.slots = await this.applyGarmentCanvasDefaults(
        dto.slots ?? [],
        garments,
      );
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
    previousSlots: OutfitSlot[] = [],
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

    const usedPreviousIndexes = new Set<number>();

    return cats.map((cat, i) => {
      const nextGarmentId = ids[i] ? Number(ids[i]) : null;

      // Prefer the same array index, but fall back to matching the same
      // category/garment so Sortable row reordering does not reset transforms.
      let previousIndex = i;
      if (
        !previousSlots[previousIndex] ||
        usedPreviousIndexes.has(previousIndex) ||
        previousSlots[previousIndex].category !== cat ||
        previousSlots[previousIndex].garmentId !== nextGarmentId
      ) {
        previousIndex = previousSlots.findIndex(
          (slot, index) =>
            !usedPreviousIndexes.has(index) &&
            slot.category === cat &&
            slot.garmentId === nextGarmentId,
        );
      }

      if (previousIndex >= 0 && previousSlots[previousIndex]) {
        usedPreviousIndexes.add(previousIndex);
        const previous = previousSlots[previousIndex];

        return {
          ...previous,
          category: cat,
          garmentId: nextGarmentId,
        };
      }

      return {
        category: cat,
        garmentId: nextGarmentId,
      };
    });
  }

  private async applyGarmentCanvasDefaults(
    slots: OutfitSlot[],
    garments: Garment[],
  ): Promise<OutfitSlot[]> {
    const settings = await this.canvasSettingsService.getSettings();
    const garmentsById = new Map(
      garments.map((garment) => [garment.id, garment]),
    );
    const usedZIndexes = new Set(
      slots
        .map((slot) => slot.zIndex)
        .filter((z): z is number => Number.isFinite(z)),
    );
    let nextZIndex = usedZIndexes.size ? Math.max(...usedZIndexes) + 1 : 0;

    return slots.map((slot) => {
      if (slot.garmentId == null) return slot;

      const garment = garmentsById.get(slot.garmentId);
      if (!garment) return slot;

      const defaults = getDefaultGarmentTransform(
        garment.category,
        garment,
        settings,
      );

      return {
        ...slot,
        position: slot.position ?? { x: defaults.x, y: defaults.y },
        rotation: slot.rotation ?? defaults.rotation,
        scale: slot.scale ?? defaults.scale,
        zIndex: slot.zIndex ?? defaults.zIndex ?? nextZIndex++,
      };
    });
  }

  async buildCanvasGarments(outfit: Outfit) {
    const settings = await this.canvasSettingsService.getSettings();
    const garmentsById = new Map(
      outfit.garments.getItems().map((garment) => [garment.id, garment]),
    );

    return (outfit.slots ?? [])
      .map((slot, index) => {
        if (slot.garmentId == null) return null;

        const garment = garmentsById.get(slot.garmentId);
        if (!garment) return null;
        const defaults = getDefaultGarmentTransform(
          garment.category,
          garment,
          settings,
        );

        return {
          slotIndex: index,
          garment,
          position: {
            x: slot.position?.x ?? defaults.x,
            y: slot.position?.y ?? defaults.y,
          },
          rotation: slot.rotation ?? defaults.rotation,
          scale: slot.scale ?? defaults.scale,
          zIndex: slot.zIndex ?? defaults.zIndex ?? index,
        };
      })
      .filter(
        (
          item,
        ): item is {
          slotIndex: number;
          garment: Garment;
          position: { x: number; y: number };
          rotation: number;
          scale: number;
          zIndex: number;
        } => item !== null,
      );
  }

  async updateSlotTransform(
    id: number,
    slotIndex: number,
    transform: {
      x: number;
      y: number;
      rotation: number;
      scale: number;
    },
    userId?: number,
  ): Promise<Outfit> {
    const outfit = await this.findOne(id, userId);
    const slots = outfit.slots ? [...outfit.slots] : [];

    if (
      !Number.isInteger(slotIndex) ||
      slotIndex < 0 ||
      slotIndex >= slots.length
    ) {
      throw new NotFoundException('Outfit slot not found');
    }

    if (
      !Number.isFinite(transform.x) ||
      !Number.isFinite(transform.y) ||
      !Number.isFinite(transform.rotation) ||
      !Number.isFinite(transform.scale) ||
      transform.scale <= 0
    ) {
      throw new BadRequestException('Invalid outfit slot transform');
    }

    const slot = slots[slotIndex];
    slots[slotIndex] = {
      ...slot,
      position: { x: transform.x, y: transform.y },
      rotation: transform.rotation,
      scale: transform.scale,
    };

    outfit.slots = slots;
    await this.outfitRepository.getEntityManager().flush();

    return outfit;
  }

  async updateSlotLayer(
    id: number,
    slotIndex: number,
    direction: 'up' | 'down',
    userId?: number,
  ): Promise<Outfit> {
    const outfit = await this.findOne(id, userId);
    const slots = outfit.slots ? [...outfit.slots] : [];

    if (slotIndex < 0 || slotIndex >= slots.length) {
      throw new NotFoundException('Outfit slot not found');
    }

    const current = slots[slotIndex];
    if (current.garmentId == null) return outfit;

    const currentZ = current.zIndex ?? slotIndex;
    const candidates = slots
      .map((slot, index) => ({ slot, index, z: slot.zIndex ?? index }))
      .filter(
        ({ slot, index }) => slot.garmentId != null && index !== slotIndex,
      );

    if (direction === 'up') {
      const above = candidates
        .filter(({ z }) => z > currentZ)
        .sort((a, b) => a.z - b.z)[0];
      if (above) {
        slots[slotIndex] = { ...current, zIndex: above.z };
        slots[above.index] = { ...slots[above.index], zIndex: currentZ };
      }
    } else {
      const below = candidates
        .filter(({ z }) => z < currentZ)
        .sort((a, b) => b.z - a.z)[0];
      if (below) {
        slots[slotIndex] = { ...current, zIndex: below.z };
        slots[below.index] = { ...slots[below.index], zIndex: currentZ };
      }
    }

    outfit.slots = slots;
    await this.outfitRepository.getEntityManager().flush();
    return outfit;
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
          return toRow(slot.category, items, selected?.id ?? null, false);
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
      return toRow(cat, items, selected?.id ?? null, true);
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
