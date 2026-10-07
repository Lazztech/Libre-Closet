import { GarmentCategory } from './garment-category.enum';
import {
  CanvasSettings,
  DEFAULT_CANVAS_SETTINGS,
} from './canvas-settings.service';

export interface OutfitCanvasTransform {
  x: number;
  y: number;
  rotation: number;
  scale: number;
  zIndex?: number;
}

export interface GarmentCanvasDefaults {
  canvasPositionX?: number;
  canvasPositionY?: number;
  canvasRotation?: number;
  canvasScale?: number;
}

export function getDefaultGarmentTransform(
  category: string,
  garment?: GarmentCanvasDefaults,
  settings?: CanvasSettings,
): OutfitCanvasTransform {
  const categoryDefault = getCategoryDefaultGarmentTransform(
    category,
    settings,
  );
  return {
    x: garment?.canvasPositionX ?? categoryDefault.x,
    y: garment?.canvasPositionY ?? categoryDefault.y,
    rotation: garment?.canvasRotation ?? categoryDefault.rotation,
    scale: garment?.canvasScale ?? categoryDefault.scale,
    zIndex: categoryDefault.zIndex,
  };
}

export function getCategoryDefaultGarmentTransform(
  category: string,
  settings: CanvasSettings = DEFAULT_CANVAS_SETTINGS,
): OutfitCanvasTransform {
  const value =
    settings.categories[category] ?? settings.categories[GarmentCategory.OTHER];
  return { ...value };
}
