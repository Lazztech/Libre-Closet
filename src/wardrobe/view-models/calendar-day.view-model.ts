import { OutfitCalendar } from '../../dal/entity/outfit-calendar.entity';

export interface CalendarDay {
  date: Date;
  entries: OutfitCalendar[];
}
