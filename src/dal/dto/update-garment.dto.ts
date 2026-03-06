import { GarmentCategory } from '../entity/garment-category.enum';
import { GarmentColor } from '../entity/garment-color.enum';
import { Observable } from 'rxjs';
import { MultipartFileStream } from '@proventuslabs/nestjs-multipart-form';

export interface UpdateGarmentDto {
  name?: string;
  category?: GarmentCategory;
  brand?: string;
  color?: GarmentColor;
  size?: string;
  notes?: string;
  photo$?: Observable<MultipartFileStream>;
}
