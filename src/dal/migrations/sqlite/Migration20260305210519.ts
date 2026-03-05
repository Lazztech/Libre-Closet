import { Migration } from '@mikro-orm/migrations';

export class Migration20260305210519 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table \`garment\` drop column \`colors\`;`);

    this.addSql(`alter table \`garment\` add column \`color\` text null;`);
  }

}
