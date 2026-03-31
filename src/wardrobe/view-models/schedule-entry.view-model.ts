import { OutfitSchedule } from '../../dal/entity/outfit-schedule.entity';

export interface ScheduleEntryViewModel {
  entry: OutfitSchedule;
  /** Positive integer when wornAt appears within REPEAT_WEAR_DAYS of date; else null. */
  repeatWarnDays: number | null;
}
