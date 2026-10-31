import { Migration } from '@mikro-orm/migrations';

export class Migration20261028235500 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table \`garment\` add column \`rating\` integer null;`);
    this.addSql(`alter table \`garment\` add column \`seasons\` text null;`);
    this.addSql(`alter table \`garment\` add column \`occasions\` text null;`);
    this.addSql(`alter table \`garment\` add column \`purchase_link\` text null;`);
    this.addSql(`alter table \`garment\` add column \`cost\` numeric(12,2) null;`);
    this.addSql(`alter table \`garment\` add column \`print\` text null;`);
    this.addSql(`alter table \`garment\` add column \`look\` text null;`);
    this.addSql(`alter table \`garment\` add column \`fit\` text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table \`garment\` drop column \`rating\`;`);
    this.addSql(`alter table \`garment\` drop column \`seasons\`;`);
    this.addSql(`alter table \`garment\` drop column \`occasions\`;`);
    this.addSql(`alter table \`garment\` drop column \`purchase_link\`;`);
    this.addSql(`alter table \`garment\` drop column \`cost\`;`);
    this.addSql(`alter table \`garment\` drop column \`print\`;`);
    this.addSql(`alter table \`garment\` drop column \`look\`;`);
    this.addSql(`alter table \`garment\` drop column \`fit\`;`);
  }

}
