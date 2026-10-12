import { Migration } from '@mikro-orm/migrations';

export class Migration20261006120001 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "garment" add column "canvas_position_x" double precision not null default 500;`);
    this.addSql(`alter table "garment" add column "canvas_position_y" double precision not null default 500;`);
    this.addSql(`alter table "garment" add column "canvas_rotation" double precision not null default 0;`);
    this.addSql(`alter table "garment" add column "canvas_scale" double precision not null default 1;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "garment" drop column "canvas_position_x";`);
    this.addSql(`alter table "garment" drop column "canvas_position_y";`);
    this.addSql(`alter table "garment" drop column "canvas_rotation";`);
    this.addSql(`alter table "garment" drop column "canvas_scale";`);
  }
}
