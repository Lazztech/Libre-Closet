import { MultipartFile } from '@fastify/multipart';
import { GarmentColor } from '../garment-color.enum';

export interface UpdateGarmentDto {
  name?: string;
  category?: string;
  brand?: string;
  color?: GarmentColor;
  size?: string;
  notes?: string;
  photo?: MultipartFile | undefined;
  nobgPhoto?: MultipartFile | undefined;
}
