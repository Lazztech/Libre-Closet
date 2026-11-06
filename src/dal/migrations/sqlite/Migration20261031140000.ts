import { Migration } from '@mikro-orm/migrations';

export class Migration20261031140000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table \`garment\` add column \`sub_category\` text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table \`garment\` drop column \`sub_category\`;`);
  }

}
