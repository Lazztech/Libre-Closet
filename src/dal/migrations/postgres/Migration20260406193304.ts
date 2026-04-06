import { Migration } from '@mikro-orm/migrations';

export class Migration20260406193304 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "outfit_calendar" ("id" serial primary key, "date" timestamptz not null, "outfit_id" int not null, "owner_id" int null, "worn_at" timestamptz null, "notes" varchar(255) null);`);

    this.addSql(`alter table "outfit_calendar" add constraint "outfit_calendar_outfit_id_foreign" foreign key ("outfit_id") references "outfit" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "outfit_calendar" add constraint "outfit_calendar_owner_id_foreign" foreign key ("owner_id") references "user" ("id") on update cascade on delete cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "outfit_calendar" cascade;`);
  }

}
