import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MultipartFileStream } from '@proventuslabs/nestjs-multipart-form';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import * as path from 'path';
import { lastValueFrom, mergeMap, Observable, tap } from 'rxjs';
import sharp from 'sharp';
import { File } from '../../dal/entity/file.entity';
import { FileService } from '../file-service.abstract';

@Injectable()
export class LocalFileService extends FileService {
  private directory: string;

  constructor(
    readonly configService: ConfigService,
    @InjectRepository(File)
    private readonly fileRepository: EntityRepository<File>,
    private readonly em: EntityManager,
  ) {
    super(configService);
    this.logger.debug('constructor');
    this.directory = configService.getOrThrow('DATA_PATH');
    this.setupDir();
  }

  async storeImageFromFileUpload(
    upload$: Observable<MultipartFileStream>,
    userId: any,
  ): Promise<File> {
    const fileName = randomUUID() + '.webp';
    const transformer = sharp()
      .webp({ quality: 100 })
      .resize(1080, 1080, { fit: sharp.fit.inside });
    const writeStream = fs.createWriteStream(
      path.join(this.directory, fileName),
    );

    try {
      // https://rxjs.dev/api/index/function/lastValueFrom
      await lastValueFrom(
        upload$.pipe(
          // https://rxjs.dev/api/operators/tap
          tap((fileStream: MultipartFileStream) => {
            if (!fileStream.mimetype?.startsWith('image/')) {
              throw new HttpException('Wrong filetype', HttpStatus.BAD_REQUEST);
            }
          }),
          // transform and write using node stream pipeline which returns a Promise
          // https://rxjs.dev/api/operators/mergeMap
          mergeMap((fileStream: MultipartFileStream) =>
            // https://stackoverflow.com/questions/58875655/whats-the-difference-between-pipe-and-pipeline-on-streams
            pipeline(fileStream, transformer, writeStream),
          ),
        ),
      );
      writeStream.destroy();
    } catch (error) {
      writeStream.destroy();
      throw error;
    }

    // repository.create => save pattern used to so that the @BeforeInsert decorated method
    // will fire generating a uuid for the shareableId
    const file = this.fileRepository.create({
      fileName,
      createdOn: new Date().toISOString(),
      createdBy: userId,
    });
    await this.em.persistAndFlush(file);
    return file;
  }

  async get(fileName: string): Promise<Readable | undefined> {
    if (fs.existsSync(path.join(this.directory, fileName))) {
      return new Promise((resolve) =>
        resolve(fs.createReadStream(path.join(this.directory, fileName))),
      );
    } else {
      throw new NotFoundException(fileName);
    }
  }

  async getByShareableId(shareableId: string): Promise<Readable> {
    const file = await this.fileRepository.findOneOrFail({ shareableId });
    if (fs.existsSync(path.join(this.directory, file.fileName))) {
      return fs.createReadStream(path.join(this.directory, file.fileName));
    } else {
      throw new NotFoundException(file.fileName);
    }
  }

  async delete(fileName: string): Promise<void> {
    return fs.promises
      .unlink(path.join(this.directory, fileName))
      .catch((err) => this.logger.warn(err));
  }

  public async deleteById(fileId: any, userId: any): Promise<any> {
    const file = await this.fileRepository.findOneOrFail({
      id: fileId,
      createdBy: userId,
    });
    await fs.promises
      .unlink(path.join(this.directory, file.fileName))
      .catch((err) => this.logger.warn(err));
    return this.fileRepository.getEntityManager().removeAndFlush(file);
  }

  setupDir() {
    if (!fs.existsSync(this.directory)) {
      this.logger.debug('creating uploads directory');
      fs.mkdirSync(this.directory, { recursive: true });
    }
    this.logger.debug('uploads directory exists');
  }

  private deleteFile(fileName: string): Promise<void> {
    return fs.promises.unlink(path.join(this.directory, fileName));
  }
}
