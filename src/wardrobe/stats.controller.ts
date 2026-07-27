import { Controller, Get, Render, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { GarmentService } from './garment.service';

@Controller('stats')
export class StatsController {
  constructor(
    private readonly garmentService: GarmentService,
  ) {}

  @Get()
  @Render('stats/index')
  async index(@Req() req: FastifyRequest) {

    // temporary user ID until auth is wired in
    const userId = 1;

    const stats = await this.garmentService.getWearStats(userId);

    return {
      stats,
    };
  }
}