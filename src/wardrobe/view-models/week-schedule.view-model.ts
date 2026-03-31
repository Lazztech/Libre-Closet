import { ScheduleDay } from './schedule-day.view-model';

export interface WeekSchedule {
  /** ISO date string (YYYY-MM-DD) for the Monday of the week. */
  weekStart: Date;
  /** Seven days, Sun–Sat, each with its scheduled entries. */
  days: ScheduleDay[];
}
