import { OutfitSlot } from 'src/dal/entity/outfit.entity';

export interface UpdateOutfitDto {
  name?: string;
  notes?: string;
  rating?: number;
  slots?: OutfitSlot[];
  looks?: string;
  look?: string;
  occasions?: string;
  seasons?: string;
}
