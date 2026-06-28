import { Migration } from '@mikro-orm/migrations';

export class Migration20260617003818 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table \`garment\` add column \`date_aquired\` datetime null;`);
  }

}
