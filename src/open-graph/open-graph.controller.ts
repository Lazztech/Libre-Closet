import { Controller, Get, Query, Render, Req } from '@nestjs/common';
import { type Request } from 'express';
import { OpenGraphService } from './open-graph.service';

@Controller('share')
export class OpenGraphController {
  constructor(private readonly openGraphService: OpenGraphService) {}

  @Get()
  @Render('share')
  share(
    @Query('shareableId') shareableId: string,
    @Query('type') type: string,
    @Req() req: Request,
  ) {
    return this.openGraphService.getShareableTagValues(shareableId, type, req);
  }
}
