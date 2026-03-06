import { GarmentCategory } from '../garment-category.enum';
import { GarmentColor } from '../garment-color.enum';
import { Observable } from 'rxjs';
import { MultipartFileStream } from '@proventuslabs/nestjs-multipart-form';

export interface CreateGarmentDto {
  name: string;
  category: GarmentCategory;
  brand?: string;
  color?: GarmentColor;
  size?: string;
  notes?: string;
  photo$?: Observable<MultipartFileStream>;
}
