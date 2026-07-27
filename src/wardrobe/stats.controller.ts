import { Controller, Get, Render, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { GarmentService } from './garment.service';
import { ConditionalAuthGuard } from '../auth/conditional-auth.guard';
import { Payload } from '../auth/dto/payload.dto';

@UseGuards(ConditionalAuthGuard)
@Controller('stats')
export class StatsController {
  constructor(
    private readonly garmentService: GarmentService,
  ) {}

  private userId(req: FastifyRequest): number | undefined {
    return (req['user'] as Payload | undefined)?.userId;
  }

  @Get()
  @Render('stats/index')
  async index(@Req() req: FastifyRequest) {

    console.log("stats request user:", req['user']);

    const userId = this.userId(req);

    if (userId == null) {
      throw new Error('No user ID found');
    }

    const stats = await this.garmentService.getWearStats(userId);

    return {
      stats,
    };
  }
}