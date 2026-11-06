import { Migration } from '@mikro-orm/migrations';

export class Migration20261101030000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table \`outfit\` add column \`rating\` integer null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table \`outfit\` drop column \`rating\`;`);
  }

}
