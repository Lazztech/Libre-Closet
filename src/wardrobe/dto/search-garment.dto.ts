import { GarmentCategory } from '../garment-category.enum';
import { GarmentColor } from '../garment-color.enum';

export interface SearchGarmentDto {
  keyword?: string;
  category?: GarmentCategory;
  color?: GarmentColor;
  brand?: string;
  size?: string;
}
