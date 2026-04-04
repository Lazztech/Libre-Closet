import { CalendarDay } from './calendar-day.view-model';

export interface WeekSchedule {
  /** ISO date string (YYYY-MM-DD) for the Monday of the week. */
  weekStart: Date;
  /** Seven days, Sun–Sat, each with its calendar entries. */
  days: CalendarDay[];
}
