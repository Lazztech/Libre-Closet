import { Migration } from '@mikro-orm/migrations';

export class Migration20260617011648 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "garment" add column "washing_details" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "garment" drop column "washing_details";`);
  }

}
