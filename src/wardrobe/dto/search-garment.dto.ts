import { GarmentColor } from '../garment-color.enum';

export interface SearchGarmentDto {
  keyword?: string;
  category?: string;
  subCategory?: string;
  color?: GarmentColor;
  brand?: string;
  size?: string;
  archived?: string;
  season?: string;
  occasion?: string;
  rating?: number | string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
