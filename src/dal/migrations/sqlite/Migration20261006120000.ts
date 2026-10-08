import { Migration } from '@mikro-orm/migrations';

export class Migration20261006120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table \`garment\` add column \`canvas_position_x\` real not null default 500;`);
    this.addSql(`alter table \`garment\` add column \`canvas_position_y\` real not null default 500;`);
    this.addSql(`alter table \`garment\` add column \`canvas_rotation\` real not null default 0;`);
    this.addSql(`alter table \`garment\` add column \`canvas_scale\` real not null default 1;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table \`garment\` drop column \`canvas_position_x\`;`);
    this.addSql(`alter table \`garment\` drop column \`canvas_position_y\`;`);
    this.addSql(`alter table \`garment\` drop column \`canvas_rotation\`;`);
    this.addSql(`alter table \`garment\` drop column \`canvas_scale\`;`);
  }
}
