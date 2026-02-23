import { Options } from '@mikro-orm/core';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';

export default {
  name: 'postgre',
  driver: PostgreSqlDriver,
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  // default credential used for cli migration generation against a local debugging instance of postgres
  // This is overriden in application startup in the mikro-orm module initiation with configuration values
  password: 'Password123',
  dbName: 'postgres',
  entities: ['src/dal/entity/**/*.*.*'],
  migrations: {
    path: 'src/dal/migrations/postgres',
    pattern: /^[\w-]+\d+|\d\.ts$/,
    transactional: true,
  },
  debug: true,
} as Options;
