import { MikroORM } from '@mikro-orm/core';
import {
  Logger,
  MiddlewareConsumer,
  Module,
  NestModule,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Joi from 'joi';
import * as path from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DalModule } from './dal/dal.module';
import { NotificationModule } from './notification/notification.module';
import { FileModule } from './file/file.module';
import { EmailModule } from './email/email.module';
import { ViewContextMiddleware } from './middleware/view-context.middleware';
import { AcceptLanguageResolver, I18nModule } from 'nestjs-i18n';
import { OpenGraphModule } from './open-graph/open-graph.module';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { User } from './dal/entity/user.entity';
import { seconds, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const options = {
          singleLine: true,
          colorize: true,
          levelFirst: false,
          translateTime: 'yyyy-mm-dd HH:MM:ss',
          destination: 1,
        };
        return {
          pinoHttp: {
            transport: {
              targets: [
                {
                  target: 'pino-pretty',
                  level: 'info',
                  options,
                },
                {
                  target: 'pino-pretty',
                  level: 'info',
                  options: {
                    ...options,
                    // app.log file in data path
                    destination: path.join(
                      configService.getOrThrow('DATA_PATH'),
                      'app.log',
                    ),
                    mkdir: true,
                  },
                },
              ],
            },
          },
        };
      },
    }),
    ConfigModule.forRoot({
      envFilePath: ['.env.local', '.env'],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('production'),
        PORT: Joi.number().default(3000),
        APP_NAME: Joi.string().default('Boilerplate'),
        AUTH_ENABLED: Joi.boolean().default(false),
        PWA_ENABLED: Joi.boolean().default(false),
        ACCESS_TOKEN_SECRET: Joi.string().default('ChangeMe!'),
        PUBLIC_VAPID_KEY: Joi.optional().default(
          'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U',
        ),
        PRIVATE_VAPID_KEY: Joi.optional().default(
          'UUxI4O8-FbRouAevSmBQ6o18hgE4nSG3qwvJTfKc-ls',
        ),
        SITE_URL: Joi.string().default('https://mysite.com'),
        ICON_NAME: Joi.string().default('lazztech_icon.webp'),
        DATA_PATH: Joi.string().default(path.join(process.cwd(), 'data')),
        DATABASE_TYPE: Joi.string()
          .valid('sqlite', 'postgres')
          .default('sqlite'),
        DATABASE_SCHEMA: Joi.string()
          .when('DATABASE_TYPE', {
            is: 'sqlite',
            then: Joi.string().default((parent) =>
              path.join(parent.DATA_PATH, 'sqlite3.db'),
            ),
          })
          .when('DATABASE_TYPE', {
            is: 'postgres',
            then: Joi.string().required(),
          }),
        DATABASE_HOST: Joi.string().when('DATABASE_TYPE', {
          is: 'postgres',
          then: Joi.string().required(),
          otherwise: Joi.optional(),
        }),
        DATABASE_PORT: Joi.number().when('DATABASE_TYPE', {
          is: 'postgres',
          then: Joi.number().required(),
          otherwise: Joi.optional(),
        }),
        DATABASE_USER: Joi.string().when('DATABASE_TYPE', {
          is: 'postgres',
          then: Joi.string().required(),
          otherwise: Joi.optional(),
        }),
        DATABASE_PASS: Joi.string().when('DATABASE_TYPE', {
          is: 'postgres',
          then: Joi.string().required(),
          otherwise: Joi.optional(),
        }),
        DATABASE_SSL: Joi.boolean().when('DATABASE_TYPE', {
          is: 'postgres',
          then: Joi.boolean().default(false),
          otherwise: Joi.optional(),
        }),
        FILE_STORAGE_TYPE: Joi.string()
          .valid('local', 'object')
          .default('local'),
        OBJECT_STORAGE_BUCKET_NAME: Joi.string().when('FILE_STORAGE_TYPE', {
          is: 'object',
          then: Joi.string().required(),
          otherwise: Joi.optional(),
        }),
        OBJECT_STORAGE_ACCESS_KEY_ID: Joi.string().when('FILE_STORAGE_TYPE', {
          is: 'object',
          then: Joi.string().required(),
          otherwise: Joi.optional(),
        }),
        OBJECT_STORAGE_SECRET_ACCESS_KEY: Joi.string().when(
          'FILE_STORAGE_TYPE',
          {
            is: 'object',
            then: Joi.string().required(),
            otherwise: Joi.optional(),
          },
        ),
        OBJECT_STORAGE_ENDPOINT: Joi.string().when('FILE_STORAGE_TYPE', {
          is: 'object',
          then: Joi.string().required(),
          otherwise: Joi.optional(),
        }),
      }),
      validationOptions: {
        abortEarly: true,
      },
      isGlobal: true,
    }),
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      resolvers: [AcceptLanguageResolver],
      loaderOptions: {
        path: path.join(__dirname, '/i18n/'),
        watch: process.env.NODE_ENV !== 'production',
      },
      // only try to build types output types in src directory if the NODE_ENV is not 'production'
      typesOutputPath:
        process.env.NODE_ENV !== 'production'
          ? path.join(__dirname, '../src/generated/i18n.generated.ts')
          : undefined,
      viewEngine: 'hbs',
    }),
    MikroOrmModule.forFeature([User]),
    // https://docs.nestjs.com/security/rate-limiting
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: seconds(60),
          limit: 100,
        },
      ],
    }),
    DalModule,
    AuthModule,
    FileModule,
    EmailModule,
    NotificationModule,
    OpenGraphModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // https://docs.nestjs.com/security/rate-limiting#rate-limiting
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements OnModuleInit, NestModule {
  public logger = new Logger(AppModule.name);

  constructor(
    private readonly orm: MikroORM,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log(`NODE_ENV: ${this.configService.get('NODE_ENV')}`);
    this.logger.log(`DATA_PATH: ${this.configService.get('DATA_PATH')}`);
    await this.orm.getMigrator().up();
  }

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ViewContextMiddleware).forRoutes('*');
  }
}
