import { Migration } from '@mikro-orm/migrations';

export class Migration20260616235908 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "garment" add column "archived" boolean not null default false;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "garment" drop column "archived";`);
  }

}
