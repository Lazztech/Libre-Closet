import { Migration } from '@mikro-orm/migrations';

export class Migration20261028235501 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "garment" add column if not exists "rating" integer null;`);
    this.addSql(`alter table "garment" add column if not exists "seasons" text null;`);
    this.addSql(`alter table "garment" add column if not exists "occasions" text null;`);
    this.addSql(`alter table "garment" add column if not exists "purchase_link" text null;`);
    this.addSql(`alter table "garment" add column if not exists "cost" numeric(12,2) null;`);
    this.addSql(`alter table "garment" add column if not exists "print" text null;`);
    this.addSql(`alter table "garment" add column if not exists "look" text null;`);
    this.addSql(`alter table "garment" add column if not exists "fit" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "garment" drop column if exists "rating";`);
    this.addSql(`alter table "garment" drop column if exists "seasons";`);
    this.addSql(`alter table "garment" drop column if exists "occasions";`);
    this.addSql(`alter table "garment" drop column if exists "purchase_link";`);
    this.addSql(`alter table "garment" drop column if exists "cost";`);
    this.addSql(`alter table "garment" drop column if exists "print";`);
    this.addSql(`alter table "garment" drop column if exists "look";`);
    this.addSql(`alter table "garment" drop column if exists "fit";`);
  }

}
