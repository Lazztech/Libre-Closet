import {
  BadRequestException,
  Controller,
  Get,
  Header,
  Post,
  Render,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { I18n, I18nContext } from 'nestjs-i18n';
import type { FastifyReply, FastifyRequest } from 'fastify';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ConfigService } from '@nestjs/config';
import { ConditionalAuthGuard } from '../auth/conditional-auth.guard';
import { GarmentCategory } from './garment-category.enum';
import { CanvasSettingsService } from './canvas-settings.service';

@Controller('settings')
export class SettingsController {
  constructor(
    private readonly canvasSettings: CanvasSettingsService,
    private readonly configService: ConfigService,
  ) {}

  @UseGuards(ConditionalAuthGuard)
  @Get()
  @Render('settings/index')
  async index(@I18n() i18n: I18nContext) {
    const settings = await this.canvasSettings.getSettings();
    const categories = Object.values(GarmentCategory).map((value) => ({
      value,
      label: i18n.t(`lang.CATEGORY_${value.toUpperCase()}`),
      setting: settings.categories[value],
    }));
    return {
      categories,
      mannequinUrl: '/settings/mannequin',
    };
  }

  @UseGuards(ConditionalAuthGuard)
  @Post()
  async save(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const categories: Record<string, any> = {};

    for (const category of Object.values(GarmentCategory)) {
      const x = Number(body[`${category}__x`]);
      const y = Number(body[`${category}__y`]);
      const rotation = Number(body[`${category}__rotation`]);
      const scale = Number(body[`${category}__scale`]);
      const zIndex = Number(body[`${category}__zIndex`]);
      if (
        ![x, y, rotation, scale, zIndex].every(Number.isFinite) ||
        scale <= 0
      ) {
        throw new BadRequestException(`Invalid settings for ${category}`);
      }
      categories[category] = { x, y, rotation, scale, zIndex };
    }

    await this.canvasSettings.saveSettings({ categories });
    return reply.redirect('/settings', 303);
  }

  @UseGuards(ConditionalAuthGuard)
  @Post('mannequin')
  async uploadMannequin(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    const upload = await req.file();
    await this.canvasSettings.storeMannequin(upload);
    return reply.redirect('/settings', 303);
  }

  @Get('mannequin')
  @Header('content-type', 'image/png')
  @Header('cache-control', 'no-cache')
  async mannequin(): Promise<StreamableFile> {
    const mannequinPath = (await this.canvasSettings.mannequinExists())
      ? this.canvasSettings.getMannequinPath()
      : path.join(process.cwd(), 'public', 'assets', 'mannequin.png');
    return new StreamableFile(fs.createReadStream(mannequinPath));
  }
}
