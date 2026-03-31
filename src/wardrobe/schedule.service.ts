import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OutfitSchedule } from '../dal/entity/outfit-schedule.entity';
import { Outfit } from '../dal/entity/outfit.entity';
import { User } from '../dal/entity/user.entity';
import { CreateScheduleEntryDto } from './dto/create-schedule-entry.dto';
import { ScheduleDay } from './view-models/schedule-day.view-model';
import { WeekSchedule } from './view-models/week-schedule.view-model';

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);

  constructor(
    @InjectRepository(OutfitSchedule)
    private readonly scheduleRepository: EntityRepository<OutfitSchedule>,
    @InjectRepository(Outfit)
    private readonly outfitRepository: EntityRepository<Outfit>,
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
  ) {}

  /**
   * Returns a WeekSchedule for the 7-day window starting on the Sunday
   * that contains `anchorDate`.  Populates outfit + garment thumbnails and
   * annotates each entry with a repeat-wear warning when applicable.
   */
  async findWeek(anchorDate: Date, userId?: number): Promise<WeekSchedule> {
    const weekStart = startOfWeek(anchorDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const ownerFilter =
      userId != null ? { owner: { id: userId } } : { owner: null };

    const entries = await this.scheduleRepository.find(
      { ...ownerFilter, date: { $gte: weekStart, $lt: weekEnd } },
      { populate: ['outfit', 'outfit.garments', 'outfit.garments.photo'] },
    );

    const days: ScheduleDay[] = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      return { date, entries: [] };
    });

    for (const entry of entries) {
      const dayIndex = daysBetween(weekStart, entry.date);
      if (dayIndex < 0 || dayIndex > 6) continue;

      days[dayIndex].entries.push(entry);
    }

    return { weekStart, days };
  }

  async create(
    dto: CreateScheduleEntryDto,
    userId?: number,
  ): Promise<OutfitSchedule> {
    const outfit = await this.outfitRepository.findOne(
      userId != null
        ? { id: dto.outfitId, owner: { id: userId } }
        : { id: dto.outfitId, owner: null },
    );
    if (!outfit) throw new NotFoundException('Outfit not found');

    const entry = this.scheduleRepository.create({
      date: dto.date,
      outfit,
      notes: dto.notes,
    });

    if (userId != null) {
      const user = await this.userRepository.findOneOrFail(userId);
      entry.owner = user as any;
    }

    await this.scheduleRepository.getEntityManager().persistAndFlush(entry);
    this.logger.log(
      `Schedule entry created: outfitId=${dto.outfitId} date=${dto.date.toISOString()} userId=${userId}`,
    );
    return entry;
  }

  async remove(id: number, userId?: number): Promise<void> {
    const entry = await this.findOneOwned(id, userId);
    await this.scheduleRepository.getEntityManager().removeAndFlush(entry);
  }

  /**
   * Toggles the wornAt field.  If wornAt is null, sets it to today.
   * If already set, clears it (unmark worn).
   */
  async toggleWorn(id: number, userId?: number): Promise<OutfitSchedule> {
    const entry = await this.findOneOwned(id, userId);
    entry.wornAt = entry.wornAt == null ? new Date() : undefined;
    await this.scheduleRepository.getEntityManager().flush();
    return entry;
  }

  /** Returns outfits the user may schedule (respects auth scoping). */
  async findOutfitsForUser(userId?: number): Promise<Outfit[]> {
    if (userId != null) {
      return this.outfitRepository.find(
        { owner: { id: userId } },
        { populate: ['garments', 'garments.photo'] },
      );
    }
    return this.outfitRepository.find(
      { owner: null },
      { populate: ['garments', 'garments.photo'] },
    );
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async findOneOwned(
    id: number,
    userId?: number,
  ): Promise<OutfitSchedule> {
    const entry = await this.scheduleRepository.findOne(id, {
      populate: ['outfit'],
    });
    if (!entry) throw new NotFoundException('Schedule entry not found');

    if (userId != null) {
      if (entry.owner?.id !== userId) throw new ForbiddenException();
    } else {
      if (entry.owner != null) throw new ForbiddenException();
    }
    return entry;
  }
}

// ---------------------------------------------------------------------------
// Pure date helpers (no external deps)
// ---------------------------------------------------------------------------

/** Returns the Sunday of the week containing `d` at midnight UTC. */
function startOfWeek(d: Date): Date {
  const result = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  result.setUTCDate(result.getUTCDate() - result.getUTCDay());
  return result;
}

/** Number of whole days from `from` to `to` (positive when to > from). */
function daysBetween(from: Date, to: Date): number {
  return Math.round(
    (Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()) -
      Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())) /
      86_400_000,
  );
}
