import { Migration } from '@mikro-orm/migrations';

export class Migration20261031140001 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "garment" add column if not exists "sub_category" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "garment" drop column if exists "sub_category";`);
  }

}
