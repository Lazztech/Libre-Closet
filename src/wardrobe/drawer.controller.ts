import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  Render,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { ConditionalAuthGuard } from '../auth/conditional-auth.guard';
import { Payload } from '../auth/dto/payload.dto';
import { DrawerService } from './drawer.service';
import { GarmentService } from './garment.service';

@UseGuards(ConditionalAuthGuard)
@Controller('drawers')
export class DrawerController {
  private readonly logger = new Logger(DrawerController.name);

  constructor(
    private readonly drawerService: DrawerService,
    private readonly garmentService: GarmentService,
  ) {}

  private userId(req: FastifyRequest): number | undefined {
    return (req['user'] as Payload | undefined)?.userId;
  }

  private parseGarmentIds(garmentId: string | string[] | undefined): number[] {
    const ids = Array.isArray(garmentId)
      ? garmentId
      : garmentId
        ? [garmentId]
        : [];
    return ids.map(Number).filter((id) => !Number.isNaN(id));
  }

  @Get()
  @Render('drawers/index')
  async index(@Req() req: FastifyRequest) {
    const drawers = await this.drawerService.findAll(this.userId(req));
    // Collection.length is a prototype getter Handlebars' proto-access guard
    // blocks, so expose plain arrays instead of the raw MikroORM Collection.
    return {
      drawers: drawers.map((d) => ({
        id: d.id,
        name: d.name,
        notes: d.notes,
        garments: d.garments.getItems(),
      })),
    };
  }

  @Get('new')
  @Render('drawers/form')
  async newForm(@Req() req: FastifyRequest) {
    const garments = await this.garmentService.findAll(this.userId(req));
    return { drawer: null, garments, selectedGarmentIds: [] };
  }

  @Post()
  async create(
    @Body()
    body: {
      name: string;
      notes?: string;
      garmentId?: string | string[];
    },
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    const drawer = await this.drawerService.create(
      {
        name: body.name,
        notes: body.notes,
        garmentIds: this.parseGarmentIds(body.garmentId),
      },
      this.userId(req),
    );
    return reply.redirect(`/drawers/${drawer.id}`, 302);
  }

  @Get(':id')
  @Render('drawers/show')
  async show(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: FastifyRequest,
  ) {
    const drawer = await this.drawerService.findOne(id, this.userId(req));
    // Collection.length is a prototype getter Handlebars' proto-access guard
    // blocks, so expose a plain array instead of the raw MikroORM Collection.
    return { drawer, garments: drawer.garments.getItems() };
  }

  @Get(':id/edit')
  @Render('drawers/form')
  async editForm(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: FastifyRequest,
  ) {
    const [drawer, garments] = await Promise.all([
      this.drawerService.findOne(id, this.userId(req)),
      this.garmentService.findAll(this.userId(req)),
    ]);
    const selectedGarmentIds = drawer.garments.getItems().map((g) => g.id);
    return { drawer, garments, selectedGarmentIds };
  }

  @Post(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      name?: string;
      notes?: string;
      garmentId?: string | string[];
    },
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    await this.drawerService.update(
      id,
      {
        name: body.name,
        notes: body.notes,
        garmentIds: this.parseGarmentIds(body.garmentId),
      },
      this.userId(req),
    );
    return reply.redirect(`/drawers/${id}`, 302);
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    await this.drawerService.remove(id, this.userId(req));
    reply.header('HX-Redirect', '/drawers');
    return reply.send();
  }
}
