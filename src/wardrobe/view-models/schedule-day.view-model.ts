import { ScheduleEntryViewModel } from './schedule-entry.view-model';

export interface ScheduleDay {
  date: Date;
  entries: ScheduleEntryViewModel[];
}
