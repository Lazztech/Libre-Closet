import { Migration } from '@mikro-orm/migrations';

export class Migration20260325000001 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "outfit_schedule" ("id" serial primary key, "date" timestamptz not null, "outfit_id" int not null, "owner_id" int null, "worn_at" timestamptz null, "notes" varchar(255) null);`);

    this.addSql(`alter table "outfit_schedule" add constraint "outfit_schedule_outfit_id_foreign" foreign key ("outfit_id") references "outfit" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "outfit_schedule" add constraint "outfit_schedule_owner_id_foreign" foreign key ("owner_id") references "user" ("id") on update cascade on delete cascade;`);

    this.addSql(`create index "outfit_schedule_outfit_id_index" on "outfit_schedule" ("outfit_id");`);
    this.addSql(`create index "outfit_schedule_owner_id_index" on "outfit_schedule" ("owner_id");`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "outfit_schedule" drop constraint "outfit_schedule_outfit_id_foreign";`);
    this.addSql(`alter table "outfit_schedule" drop constraint "outfit_schedule_owner_id_foreign";`);

    this.addSql(`drop table if exists "outfit_schedule";`);
  }

}
