import { Migration } from '@mikro-orm/migrations';

export class Migration20260326211224 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "outfit" add column "slots" jsonb null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "outfit" drop column "slots";`);
  }

}
