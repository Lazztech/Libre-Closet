import { Migration } from '@mikro-orm/migrations';

export class Migration20261101030001 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "outfit" add column if not exists "rating" integer null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "outfit" drop column if exists "rating";`);
  }

}
