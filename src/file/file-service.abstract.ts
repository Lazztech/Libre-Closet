import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Response } from 'express';
import { join } from 'path';
import sharp from 'sharp';
import { File } from 'src/dal/entity/file.entity';
import Stream, { Readable } from 'stream';
import { FileServiceInterface } from './file-service.interface';
import { Observable, Subject, mergeMap } from 'rxjs';
import { MultipartFileStream } from '@proventuslabs/nestjs-multipart-form';

type BgJob = {
  inputFn: () => Promise<Buffer>;
  resolve: (result: Buffer) => void;
  reject: (err: unknown) => void;
};

@Injectable()
export abstract class FileService
  implements FileServiceInterface, OnModuleInit
{
  public logger = new Logger(FileService.name);

  public watermark: Promise<Buffer<ArrayBufferLike>>;

  private bgQueue$ = new Subject<BgJob>();
  private removeBackgroundFn: (
    input: ArrayBuffer | Buffer | Blob,
  ) => Promise<Blob>;

  constructor(readonly configService: ConfigService) {}

  async onModuleInit() {
    if (this.configService.get<boolean>('BACKGROUND_REMOVAL_ENABLED', true)) {
      const mod = await import('@imgly/background-removal-node');
      this.removeBackgroundFn = mod.removeBackground;

      const concurrency = this.configService.get<number>(
        'BACKGROUND_REMOVAL_CONCURRENCY',
        2,
      );

      this.bgQueue$
        .pipe(
          mergeMap(async ({ inputFn, resolve, reject }) => {
            try {
              const input = await inputFn();
              const inputBlob = new Blob([input.buffer as ArrayBuffer], {
                type: 'image/webp',
              });
              const blob = await this.removeBackgroundFn(inputBlob);
              const rawBuffer = Buffer.from(await blob.arrayBuffer());
              const webpBuffer = await sharp(rawBuffer).webp().toBuffer();
              resolve(webpBuffer);
            } catch (err) {
              reject(err);
            }
          }, concurrency),
        )
        .subscribe();
    }
  }

  protected processBackground(inputFn: () => Promise<Buffer>): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      this.bgQueue$.next({ inputFn, resolve, reject });
    });
  }

  private nobgFileName(fileName: string): string {
    const extIndex = fileName.lastIndexOf('.');
    return extIndex === -1
      ? `${fileName}-nobg`
      : `${fileName.slice(0, extIndex)}-nobg${fileName.slice(extIndex)}`;
  }

  async getOrCreateNobgVariant(
    fileName: string,
    mode: 'lazy' | 'eager',
  ): Promise<Readable | null> {
    if (!this.configService.get<boolean>('BACKGROUND_REMOVAL_ENABLED', true)) {
      return null;
    }

    const nobgName = this.nobgFileName(fileName);

    const existing = await this.getStoredNobgVariant(nobgName);
    if (existing) {
      return existing;
    }

    if (mode === 'eager') {
      const outputBuffer = await this.processBackground(async () => {
        const original = await this.get(fileName);
        if (!original) throw new Error(`File not found: ${fileName}`);
        const chunks: Buffer<ArrayBufferLike>[] = [];
        for await (const chunk of original) {
          chunks.push(Buffer.from(chunk as Uint8Array));
        }
        return Buffer.concat(chunks);
      });
      await this.storeNobgVariant(nobgName, outputBuffer);
      return (await this.getStoredNobgVariant(nobgName)) ?? null;
    }

    // lazy: kick off async, caller will 302
    this.processBackground(async () => {
      const original = await this.get(fileName);
      if (!original) throw new Error(`File not found: ${fileName}`);
      const chunks: Buffer<ArrayBufferLike>[] = [];
      for await (const chunk of original) {
        chunks.push(Buffer.from(chunk as Uint8Array));
      }
      return Buffer.concat(chunks);
    })
      .then((outputBuffer) => this.storeNobgVariant(nobgName, outputBuffer))
      .catch((err) =>
        this.logger.error(
          `Failed to generate nobg variant for ${fileName}`,
          err,
        ),
      );

    return null;
  }

  abstract storeImageFromFileUpload(
    upload$: Observable<MultipartFileStream>,
    userId: any,
  ): Promise<File>;
  abstract delete(fileName: string): Promise<void>;
  abstract deleteById(fileId: any, userId: any): Promise<any>;
  abstract get(fileName: string): Promise<Readable | undefined>;
  abstract getByShareableId(shareableId: string): Promise<Readable | undefined>;
  protected abstract getStoredNobgVariant(
    nobgFileName: string,
  ): Promise<Readable | undefined>;
  protected abstract storeNobgVariant(
    nobgFileName: string,
    buffer: Buffer,
  ): Promise<void>;

  async getWatermark() {
    return sharp(
      join(
        process.cwd(),
        'public',
        'assets',
        this.configService.getOrThrow('ICON_NAME'),
      ),
    )
      .resize(150, 150)
      .extend({
        top: 0,
        bottom: 20,
        left: 20,
        right: 0,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .composite([
        {
          input: Buffer.from([0, 0, 0, 200]),
          raw: {
            width: 1,
            height: 1,
            channels: 4,
          },
          tile: true,
          blend: 'dest-in',
        },
      ])
      .toBuffer();
  }

  async watermarkImage(
    fileStream: Stream.Readable | undefined,
  ): Promise<Readable | undefined> {
    const watermark = await this.getWatermark();
    return fileStream?.pipe(
      sharp()
        .jpeg()
        .resize(1080, 1080, { fit: sharp.fit.inside })
        .composite([{ input: watermark, gravity: 'southwest' }]),
    );
  }
}
