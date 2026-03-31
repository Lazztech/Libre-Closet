import { Migration } from '@mikro-orm/migrations';

export class Migration20260331000001 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table \`outfit_schedule\` rename to \`outfit_calendar\`;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table \`outfit_calendar\` rename to \`outfit_schedule\`;`);
  }

}
