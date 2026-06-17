import { Migration } from '@mikro-orm/migrations';

export class Migration20260616235904 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table \`garment\` add column \`archived\` integer not null default false;`);
  }

}
