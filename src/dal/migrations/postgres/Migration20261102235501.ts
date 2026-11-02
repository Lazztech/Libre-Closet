import { Migration } from '@mikro-orm/migrations';

export class Migration20261102235501 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "garment" alter column "color" type text using ("color"::text);`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "garment" alter column "color" type smallint using ("color"::smallint);`);
  }

}
