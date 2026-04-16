import { OutfitSlot } from 'src/dal/entity/outfit.entity';

export interface UpdateOutfitDto {
  name?: string;
  notes?: string;
  slots?: OutfitSlot[];
}
