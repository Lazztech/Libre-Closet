import { Migration } from '@mikro-orm/migrations';

export class Migration20260306212749 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "garment" drop column "colors";`);

    this.addSql(`alter table "garment" add column "color" varchar(255) null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "garment" drop column "color";`);

    this.addSql(`alter table "garment" add column "colors" jsonb null;`);
  }

}
