import { GarmentColor } from '../garment-color.enum';

export interface SearchGarmentDto {
  keyword?: string;
  category?: string;
  color?: GarmentColor;
  brand?: string;
  size?: string;
  archived?: string;
  drawerId?: string;
  page?: string;
  limit?: string;
}
