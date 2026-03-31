import { OutfitSchedule } from '../../dal/entity/outfit-schedule.entity';

export interface ScheduleDay {
  date: Date;
  entries: OutfitSchedule[];
}
