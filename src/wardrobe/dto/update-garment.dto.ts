import { MultipartFile } from '@fastify/multipart';

export interface UpdateGarmentDto {
  name?: string;
  category?: string;
  subCategory?: string;
  brand?: string;
  color?: string;
  size?: string;
  notes?: string;
  washingDetails?: string;
  dateAquired?: string;
  files?: AsyncIterableIterator<MultipartFile>;
  rating?: number;
  seasons?: string;
  occasions?: string;
  purchaseLink?: string;
  cost?: number;
  print?: string;
  look?: string;
  fit?: string;
  pattern?: string;
  style?: string;
}
