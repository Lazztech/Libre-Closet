import { MultipartFile } from '@fastify/multipart';
export interface CreateGarmentDto {
  name?: string;
  category: string;
  brand?: string;
  color?: string;
  size?: string;
  notes?: string;
  files?: AsyncIterableIterator<MultipartFile>;
}
