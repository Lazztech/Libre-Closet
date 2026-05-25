import { Controller, Get, Query, Render, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { OpenGraphService } from './open-graph.service';

@Controller('share')
export class OpenGraphController {
  constructor(private readonly openGraphService: OpenGraphService) {}

  @Get()
  @Render('share')
  share(
    @Query('shareableId') shareableId: string,
    @Query('type') type: string,
    @Req() req: FastifyRequest,
  ) {
    return this.openGraphService.getShareableTagValues(shareableId, type, req);
  }
}
