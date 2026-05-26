import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  Controller,
  Get,
  Header,
  Inject,
  Logger,
  Param,
  Post,
  Render,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuthGuard } from '../../auth/auth.guard';
import { Payload } from '../../auth/dto/payload.dto';
import { User } from '../../auth/user.decorator';
import { User as UserEntity } from '../../dal/entity/user.entity';
import { FileService } from '../file-service.abstract';
import { ConditionalAuthGuard } from '../../auth/conditional-auth.guard';

@Controller('file')
export class FileController {
  private logger = new Logger(FileController.name);

  constructor(
    @Inject()
    private readonly fileService: FileService,
    @InjectRepository(UserEntity)
    private readonly userRepository: EntityRepository<UserEntity>,
  ) {}

  @UseGuards(ConditionalAuthGuard)
  @Get('files')
  @Render('files')
  async getFiles(@User() payload: Payload) {
    const user = await this.userRepository.findOne(
      { id: payload.userId },
      { populate: ['fileUploads'] },
    );
    return {
      files: user?.fileUploads,
    };
  }

  @UseGuards(AuthGuard)
  @Post('upload')
  @Render('files')
  async uploadFile(@User() payload: Payload, @Req() req: FastifyRequest) {
    const data = await req.file();
    await this.fileService.storeImageFromFileUpload(data, payload.userId);
    const user = await this.userRepository.findOne(
      { id: payload.userId },
      { populate: ['fileUploads'] },
    );
    return {
      files: user?.fileUploads,
    };
  }

  @Get(':fileName')
  @Header('Cache-Control', 'public, max-age=31536000, immutable') // public for CDN, max-age= 1 year for immutable content
  async getFile(@Param('fileName') fileName: string) {
    return this.fileService.get(fileName);
  }

  @Get('watermark/:shareableId')
  @Header('Cache-Control', 'public, max-age=86400') // public for CDN, max-age= 24hrs in seconds
  @Header('content-type', 'image/jpeg')
  async watermark(@Param('shareableId') shareableId: string) {
    const fileStream = await this.fileService.getByShareableId(shareableId);
    return this.fileService.watermarkImage(fileStream);
  }

  @Get('nobg/:fileName')
  @Header('content-type', 'image/webp')
  async nobg(@Param('fileName') fileName: string, @Res() reply: FastifyReply) {
    const stream = await this.fileService.getNobgVariant(fileName);
    if (!stream) {
      return reply
        .header('Cache-Control', 'no-store')
        .redirect(`/file/${fileName}`, 302);
    }
    reply.header('Cache-Control', 'no-store');
    // Log stream errors, but don't try to re-send if headers are already in flight
    stream.on('error', (err) => {
      this.logger.error(err);
      if (!reply.sent) {
        reply.code(500).send({ message: 'Internal server error' });
      }
    });
    return reply.send(stream);
  }
}
