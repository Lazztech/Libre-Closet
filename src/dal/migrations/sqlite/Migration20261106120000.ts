import { Migration } from '@mikro-orm/migrations';

export class Migration20261106120000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table \`outfit\` add column \`seasons\` text null;`);
    this.addSql(`alter table \`outfit\` add column \`occasions\` text null;`);
    this.addSql(`alter table \`outfit\` add column \`look\` text null;`);
    this.addSql(`alter table \`outfit\` add column \`created_at\` datetime null;`);
    this.addSql(`update \`outfit\` set \`created_at\` = datetime('now') where \`created_at\` is null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table \`outfit\` drop column \`seasons\`;`);
    this.addSql(`alter table \`outfit\` drop column \`occasions\`;`);
    this.addSql(`alter table \`outfit\` drop column \`look\`;`);
    this.addSql(`alter table \`outfit\` drop column \`created_at\`;`);
  }

}

