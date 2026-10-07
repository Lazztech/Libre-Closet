import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import sharp from 'sharp';
import { MultipartFile } from '@fastify/multipart';
import { GarmentCategory } from './garment-category.enum';

export interface CanvasCategorySetting {
  x: number;
  y: number;
  rotation: number;
  scale: number;
  zIndex: number;
}

export interface CanvasSettings {
  categories: Record<string, CanvasCategorySetting>;
}

export const DEFAULT_CANVAS_SETTINGS: CanvasSettings = {
  categories: {
    [GarmentCategory.ACCESSORIES]: {
      x: 680,
      y: 330,
      rotation: 0,
      scale: 0.7,
      zIndex: 60,
    },
    [GarmentCategory.BAGS]: {
      x: 730,
      y: 560,
      rotation: 0,
      scale: 0.8,
      zIndex: 50,
    },
    [GarmentCategory.OUTERWEAR]: {
      x: 500,
      y: 350,
      rotation: 0,
      scale: 1,
      zIndex: 40,
    },
    [GarmentCategory.DRESSES]: {
      x: 500,
      y: 500,
      rotation: 0,
      scale: 1,
      zIndex: 30,
    },
    [GarmentCategory.TOPS]: {
      x: 500,
      y: 330,
      rotation: 0,
      scale: 1,
      zIndex: 20,
    },
    [GarmentCategory.BOTTOMS]: {
      x: 500,
      y: 610,
      rotation: 0,
      scale: 1,
      zIndex: 20,
    },
    [GarmentCategory.FOOTWEAR]: {
      x: 500,
      y: 820,
      rotation: 0,
      scale: 0.75,
      zIndex: 10,
    },
    [GarmentCategory.OTHER]: {
      x: 500,
      y: 500,
      rotation: 0,
      scale: 1,
      zIndex: 20,
    },
  },
};

@Injectable()
export class CanvasSettingsService {
  private readonly settingsPath: string;
  private readonly mannequinPath: string;

  constructor(private readonly configService: ConfigService) {
    const dataPath = configService.getOrThrow<string>('DATA_PATH');
    this.settingsPath = path.join(dataPath, 'canvas-settings.json');
    this.mannequinPath = path.join(dataPath, 'mannequin.png');
  }

  async getSettings(): Promise<CanvasSettings> {
    try {
      const raw = await fs.readFile(this.settingsPath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<CanvasSettings>;
      return this.merge(DEFAULT_CANVAS_SETTINGS, parsed);
    } catch {
      return structuredClone(DEFAULT_CANVAS_SETTINGS);
    }
  }

  async saveSettings(settings: CanvasSettings): Promise<CanvasSettings> {
    const normalized = this.merge(DEFAULT_CANVAS_SETTINGS, settings);
    await fs.mkdir(path.dirname(this.settingsPath), { recursive: true });
    await fs.writeFile(this.settingsPath, JSON.stringify(normalized, null, 2));
    return normalized;
  }

  async storeMannequin(upload: MultipartFile | undefined): Promise<void> {
    if (!upload) throw new BadRequestException('No mannequin image uploaded');
    if (upload.mimetype !== 'image/png') {
      upload.file.resume();
      throw new BadRequestException('Mannequin must be a PNG image');
    }

    const buffer = await upload.toBuffer();
    const metadata = await sharp(buffer).metadata();
    if (!metadata.width || !metadata.height) {
      throw new BadRequestException('Invalid mannequin image');
    }

    await fs.mkdir(path.dirname(this.mannequinPath), { recursive: true });
    await fs.writeFile(this.mannequinPath, buffer);
  }

  async mannequinExists(): Promise<boolean> {
    try {
      await fs.access(this.mannequinPath);
      return true;
    } catch {
      return false;
    }
  }

  getMannequinPath(): string {
    return this.mannequinPath;
  }

  private merge(
    base: CanvasSettings,
    value: Partial<CanvasSettings>,
  ): CanvasSettings {
    const categories: Record<string, CanvasCategorySetting> = {};
    for (const category of Object.values(GarmentCategory)) {
      categories[category] = {
        ...base.categories[category],
        ...(value.categories?.[category] ?? {}),
      };
    }
    return { categories };
  }
}
