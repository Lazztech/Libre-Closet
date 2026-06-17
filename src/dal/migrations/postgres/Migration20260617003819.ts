import { Migration } from '@mikro-orm/migrations';

export class Migration20260617003819 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "garment" add column "date_aquired" timestamptz null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "garment" drop column "date_aquired";`);
  }

}
