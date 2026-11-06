import { Migration } from '@mikro-orm/migrations';

export class Migration20261106120001 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "outfit" add column if not exists "seasons" text null;`);
    this.addSql(`alter table "outfit" add column if not exists "occasions" text null;`);
    this.addSql(`alter table "outfit" add column if not exists "look" text null;`);
    this.addSql(`alter table "outfit" add column if not exists "created_at" timestamptz null default now();`);
    this.addSql(`update "outfit" set "created_at" = now() where "created_at" is null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "outfit" drop column if exists "seasons";`);
    this.addSql(`alter table "outfit" drop column if exists "occasions";`);
    this.addSql(`alter table "outfit" drop column if exists "look";`);
    this.addSql(`alter table "outfit" drop column if exists "created_at";`);
  }

}

