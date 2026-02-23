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
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  MultipartFiles,
  MultipartFileStream,
  MultipartInterceptor,
} from '@proventuslabs/nestjs-multipart-form';
import { type Response } from 'express';
import { Observable } from 'rxjs';
import { AuthGuard } from '../../auth/auth.guard';
import { Payload } from '../../auth/dto/payload.dto';
import { User } from '../../auth/user.decorator';
import { User as UserEntity } from '../../dal/entity/user.entity';
import { FileService } from '../file-service.abstract';
@Controller('file')
export class FileController {
  private logger = new Logger(FileController.name);

  constructor(
    @Inject()
    private readonly fileService: FileService,
    @InjectRepository(UserEntity)
    private readonly userRepository: EntityRepository<UserEntity>,
  ) {}

  @UseGuards(AuthGuard)
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
  @UseInterceptors(MultipartInterceptor())
  @Render('files')
  async uploadFile(
    @User() payload: Payload,
    @MultipartFiles('file') file$: Observable<MultipartFileStream>,
  ) {
    await this.fileService.storeImageFromFileUpload(file$, payload.userId);
    const user = await this.userRepository.findOne(
      { id: payload.userId },
      { populate: ['fileUploads'] },
    );
    return {
      files: user?.fileUploads,
    };
  }

  @Get(':fileName')
  @Header('Cache-Control', 'public, max-age=86400') // public for CDN, max-age= 24hrs in seconds
  async getFile(
    @Param('fileName') fileName: string,
    @Res() response: Response,
  ) {
    const readable = await this.fileService.get(fileName);
    readable?.pipe(response).on('error', (err) => {
      this.logger.error(err);
      response.status(500).send(err);
    });
  }

  @Get('watermark/:shareableId')
  @Header('Cache-Control', 'public, max-age=86400') // public for CDN, max-age= 24hrs in seconds
  @Header('content-type', 'image/jpeg')
  async watermark(
    @Param('shareableId') shareableId: string,
    @Res() response: Response,
  ) {
    const fileStream = await this.fileService.getByShareableId(shareableId);
    const readable = await this.fileService.watermarkImage(fileStream);
    readable?.pipe(response).on('error', (err) => {
      this.logger.error(err);
      response.status(500).send(err);
    });
  }
}
