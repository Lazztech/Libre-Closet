import { Migration } from '@mikro-orm/migrations';

export class Migration20260416215256 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "outfit" alter column "name" type varchar(255) using ("name"::varchar(255));`);
    this.addSql(`alter table "outfit" alter column "name" drop not null;`);

    this.addSql(`alter table "garment" alter column "name" type varchar(255) using ("name"::varchar(255));`);
    this.addSql(`alter table "garment" alter column "name" drop not null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "outfit" alter column "name" type varchar(255) using ("name"::varchar(255));`);
    this.addSql(`alter table "outfit" alter column "name" set not null;`);

    this.addSql(`alter table "garment" alter column "name" type varchar(255) using ("name"::varchar(255));`);
    this.addSql(`alter table "garment" alter column "name" set not null;`);
  }

}
