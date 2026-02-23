import { MikroOrmModule } from '@mikro-orm/nestjs';
import { FactoryProvider, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MultipartModule } from '@proventuslabs/nestjs-multipart-form';
import { S3Module, S3ModuleOptions } from 'nestjs-s3';
import { AuthModule } from '../auth/auth.module';
import { File } from '../dal/entity/file.entity';
import { User } from '../dal/entity/user.entity';
import { FileController } from './controller/file.controller';
import { FileService } from './file-service.abstract';
import { FileUrlService } from './file-url/file-url.service';
import { LocalFileService } from './local-file/local-file.service';
import { S3FileService } from './s3-file/s3-file.service';
@Module({
  imports: [
    AuthModule,
    MikroOrmModule.forFeature([File, User]),
    MultipartModule.register({
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
        files: 5,
      },
      autodrain: true, // Auto-drain unread files (default: true)
      bubbleErrors: false, // Bubble errors after controller ends (default: false)
    }),
    S3Module.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          config: {
            accessKeyId: configService.get(
              'OBJECT_STORAGE_ACCESS_KEY_ID',
              'minio',
            ),
            secretAccessKey: configService.get(
              'OBJECT_STORAGE_SECRET_ACCESS_KEY',
              'password',
            ),
            endpoint: configService.get(
              'OBJECT_STORAGE_ENDPOINT',
              'http://127.0.0.1:9000',
            ),
            s3ForcePathStyle: true,
            signatureVersion: 'v4',
          },
        } as S3ModuleOptions;
      },
    }),
  ],
  controllers: [FileController],
  providers: [
    {
      provide: FileService,
      useFactory: (
        configService: ConfigService,
        localFileService: LocalFileService,
        s3FileService: S3FileService,
      ) => {
        switch (configService.get('FILE_STORAGE_TYPE', 'local')) {
          case 'local':
            FileModule.logger.log(
              `Using local file storage: ${process.cwd()}/${configService.get(
                'DATA_PATH',
              )}`,
            );
            return localFileService;
          case 'object':
            FileModule.logger.log(
              `Using s3 file storage endpoint: ${configService.get(
                'OBJECT_STORAGE_ENDPOINT',
              )}, bucket: ${configService.get('OBJECT_STORAGE_BUCKET_NAME')}`,
            );
            return s3FileService;
          default:
            throw new Error(
              'File storage type must be either local, or object.',
            );
        }
      },
      inject: [ConfigService, LocalFileService, S3FileService],
    } as FactoryProvider,
    S3FileService,
    LocalFileService,
    FileUrlService,
  ],
  exports: [FileService, FileUrlService],
})
export class FileModule {
  public static logger = new Logger(FileModule.name);
}
