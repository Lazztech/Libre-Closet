import { Migration } from '@mikro-orm/migrations';

export class Migration20261106180001 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "garment" rename column "look" to "looks";`);
    this.addSql(`alter table "outfit" rename column "look" to "looks";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "garment" rename column "looks" to "look";`);
    this.addSql(`alter table "outfit" rename column "looks" to "look";`);
  }

}

