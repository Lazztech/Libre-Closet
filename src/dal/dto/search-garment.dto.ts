import { GarmentCategory } from '../entity/garment-category.enum';
import { GarmentColor } from '../entity/garment-color.enum';

export interface SearchGarmentDto {
  keyword?: string;
  category?: GarmentCategory;
  color?: GarmentColor;
  brand?: string;
  size?: string;
}
