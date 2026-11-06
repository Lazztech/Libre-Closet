import { OutfitSlot } from 'src/dal/entity/outfit.entity';

export interface CreateOutfitDto {
  name?: string;
  notes?: string;
  rating?: number;
  slots?: OutfitSlot[];
  look?: string;
  occasions?: string;
  seasons?: string;
}
