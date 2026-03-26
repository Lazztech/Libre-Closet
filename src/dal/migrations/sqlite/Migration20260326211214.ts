import { Migration } from '@mikro-orm/migrations';

export class Migration20260326211214 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table \`outfit\` add column \`slots\` json null;`);
  }

}
