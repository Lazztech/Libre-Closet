import { Migration } from '@mikro-orm/migrations';

export class Migration20260617011647 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table \`garment\` add column \`washing_details\` text null;`);
  }

}
