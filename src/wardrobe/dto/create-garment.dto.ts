import { MultipartFile } from '@fastify/multipart';
import { GarmentColor } from '../garment-color.enum';

export interface CreateGarmentDto {
  name?: string;
  category: string;
  brand?: string;
  color?: GarmentColor;
  size?: string;
  notes?: string;
  dateAquired?: string;
  files?: AsyncIterableIterator<MultipartFile>;
}
