import { CalendarDay } from './calendar-day.view-model';

export interface WeekCalendar {
  /** ISO date string (YYYY-MM-DD) for the Monday of the week. */
  weekStart: Date;
  /** Seven days, Sun–Sat, each with its calendar entries. */
  days: CalendarDay[];
}
