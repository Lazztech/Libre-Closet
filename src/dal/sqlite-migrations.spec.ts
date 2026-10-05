import { BetterSqliteDriver } from '@mikro-orm/better-sqlite';
import { MikroORM } from '@mikro-orm/core';
import { Migration, Migrator } from '@mikro-orm/migrations';
import { mkdtempSync, readdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * Guards against migrations that silently destroy user data.
 *
 * SQLite cannot alter a column in place, so MikroORM emits a full table
 * rebuild (create temp -> copy -> drop original -> rename). `DROP TABLE` runs
 * an implicit `DELETE FROM` that fires `ON DELETE CASCADE`, and the
 * `pragma foreign_keys = off` that is supposed to prevent that is a no-op
 * inside a transaction -- which is how migrations run here. That combination
 * wiped every `outfit_garments` row on upgrade (#129).
 *
 * This test seeds a database at the last pre-regression migration and then runs
 * the rest of the chain, asserting that no table loses rows.
 */

/** Last migration shipped in v0.3.2 -- the baseline reported in #129. */
const SEED_AFTER_MIGRATION = 'Migration20260416215236';

const MIGRATIONS_DIR = join(__dirname, 'migrations', 'sqlite');

const migrationsList = readdirSync(MIGRATIONS_DIR)
  .filter((file) => /^Migration\d+\.(ts|js)$/.test(file))
  .sort()
  .map((file) => {
    const name = file.replace(/\.(ts|js)$/, '');
    // Loaded dynamically so a newly generated migration is covered without
    // anyone having to remember to add it here.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const loaded = require(join(MIGRATIONS_DIR, file)) as Record<
      string,
      typeof Migration
    >;
    return { name, class: loaded[name] };
  });

const SEED_STATEMENTS = [
  `insert into \`password_reset\` (\`id\`, \`pin\`) values (1, '123456');`,
  `insert into \`user\` (\`id\`, \`shareable_id\`, \`email\`, \`password\`) values (1, 'user-1', 'owner@example.com', 'hashed');`,
  `insert into \`file\` (\`id\`, \`shareable_id\`, \`file_name\`, \`created_on\`, \`created_by_id\`) values (1, 'file-1', 'shirt.jpg', '2026-04-01', 1), (2, 'file-2', 'jeans.jpg', '2026-04-01', 1);`,
  `insert into \`garment\` (\`id\`, \`shareable_id\`, \`name\`, \`category\`, \`color\`, \`photo_id\`, \`owner_id\`) values (1, 'garment-1', 'Shirt', 'TOP', 'blue', 1, 1), (2, 'garment-2', 'Jeans', 'BOTTOM', 'black', 2, 1), (3, 'garment-3', 'Boots', 'SHOES', 'brown', null, 1);`,
  `insert into \`outfit\` (\`id\`, \`shareable_id\`, \`name\`, \`owner_id\`) values (1, 'outfit-1', 'Workday', 1), (2, 'outfit-2', 'Weekend', 1);`,
  `insert into \`outfit_garments\` (\`outfit_id\`, \`garment_id\`) values (1, 1), (1, 2), (2, 2), (2, 3);`,
  `insert into \`outfit_calendar\` (\`id\`, \`date\`, \`outfit_id\`, \`owner_id\`) values (1, '2026-04-02', 1, 1), (2, '2026-04-03', 2, 1);`,
];

describe('sqlite migrations', () => {
  let dir: string;
  let orm: MikroORM;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'libre-closet-migrations-'));
    orm = await MikroORM.init({
      driver: BetterSqliteDriver,
      dbName: join(dir, 'sqlite3.db'),
      entities: [],
      discovery: { warnWhenNoEntities: false },
      extensions: [Migrator],
      logger: () => undefined,
      migrations: { migrationsList, transactional: true },
    });
  });

  afterAll(async () => {
    await orm?.close(true);
    rmSync(dir, { recursive: true, force: true });
  });

  const countRows = async (): Promise<Record<string, number>> => {
    const connection = orm.em.getConnection();
    const tables = await connection.execute<{ name: string }[]>(
      `select \`name\` from \`sqlite_master\` where \`type\` = 'table' and \`name\` not like 'sqlite_%' and \`name\` != 'mikro_orm_migrations';`,
    );

    const counts: Record<string, number> = {};
    for (const { name } of tables) {
      const [row] = await connection.execute<{ count: number }[]>(
        `select count(*) as \`count\` from \`${name}\`;`,
      );
      counts[name] = row.count;
    }
    return counts;
  };

  it('preserves every row when upgrading a v0.3.2 database (#129)', async () => {
    const migrator = orm.getMigrator();

    await migrator.up({ to: SEED_AFTER_MIGRATION });
    for (const statement of SEED_STATEMENTS) {
      await orm.em.getConnection().execute(statement);
    }

    const before = await countRows();
    // Sanity check: the fixture must actually exercise the join table.
    expect(before['outfit_garments']).toBe(4);

    await migrator.up();

    const after = await countRows();
    for (const [table, count] of Object.entries(before)) {
      expect({ table, count: after[table] }).toEqual({ table, count });
    }
  });
});
