import { BetterSqliteDriver } from '@mikro-orm/better-sqlite';
import { Connection, IDatabaseDriver, MikroORM } from '@mikro-orm/core';
import { Migrator } from '@mikro-orm/migrations';
import { MikroOrmModule, MikroOrmModuleOptions } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import path from 'path';

@Module({
  imports: [
    MikroOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        switch (configService.get('DATABASE_TYPE', 'sqlite')) {
          case 'sqlite':
            return {
              name: 'sqlite',
              driver: BetterSqliteDriver,
              baseDir: process.cwd(),
              dbName: configService.getOrThrow('DATABASE_SCHEMA'),
              autoLoadEntities: true,
              extensions: [Migrator],
              migrations: {
                pattern: /^.*\.(js|ts)$/, // ends with .js or .ts
                path: path.join(__dirname, 'migrations/sqlite'),
                pathTs: path.join(__dirname, 'migrations/sqlite'),
                transactional: true,
              },
              logger: (message) => console.log(message),
              allowGlobalContext: true,
              debug: configService.get('NODE_ENV') !== 'production',
            } as MikroOrmModuleOptions<IDatabaseDriver<Connection>>;
          case 'postgres':
            return {
              name: 'postgres',
              driver: PostgreSqlDriver,
              dbName: configService.get('DATABASE_SCHEMA', 'postgres'),
              host: configService.get('DATABASE_HOST', 'localhost'),
              port: configService.get<number>('DATABASE_PORT', 5432),
              user: configService.get('DATABASE_USER', 'postgres'),
              password: configService.get('DATABASE_PASS', 'postgres'),
              autoLoadEntities: true,
              extensions: [Migrator],
              migrations: {
                pattern: /^.*\.(js|ts)$/, // ends with .js or .ts
                path: path.join(__dirname, 'migrations/postgres'),
                pathTs: path.join(__dirname, 'migrations/postgres'),
                transactional: true,
              },
              driverOptions: {
                connection: {
                  ssl: configService.get('DATABASE_SSL')
                    ? {
                        rejectUnauthorized: false,
                      }
                    : undefined,
                },
              },
              logger: (message) => console.log(message),
              allowGlobalContext: true,
              debug: configService.get('NODE_ENV') !== 'production',
            } as MikroOrmModuleOptions<IDatabaseDriver<Connection>>;
          default:
            throw new Error(
              'Invalid database type selected. It must be either sqlite (default) or postgres.',
            );
        }
      },
      // "feat: add driver option to get around issues with useFactory and inject #204"
      // https://github.com/mikro-orm/nestjs/pull/204
      // Note: driver must be set statically here, before ConfigService is available
      // This reads directly from process.env as it's evaluated at module load time
      driver:
        process.env.DATABASE_TYPE == 'sqlite'
          ? BetterSqliteDriver
          : PostgreSqlDriver,
    }),
  ],
})
export class DalModule implements OnModuleInit {
  private logger = new Logger(DalModule.name);

  constructor(
    private configService: ConfigService,
    private readonly orm: MikroORM,
  ) {}

  async onModuleInit() {
    switch (this.configService.get('DATABASE_TYPE', 'sqlite')) {
      case 'sqlite':
        this.logger.log(
          `Using sqlite db: ${this.configService.getOrThrow('DATABASE_SCHEMA')}),
          )}`,
        );
        await this.orm.em.getConnection().execute('PRAGMA journal_mode = WAL;');
        this.logger.log('SQLite WAL mode enabled');
        break;
      case 'postgres':
        this.logger.log(
          `Using postgres db: ${this.configService.get(
            'DATABASE_SCHEMA',
            'postgres',
          )}, host: ${this.configService.get('DATABASE_HOST', 'localhost')}`,
        );
        break;
    }
  }
}
