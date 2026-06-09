import { Migration } from '@mikro-orm/migrations';

export class Migration20260609060610 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "wardrobe_share" ("id" serial primary key, "grantor_id" integer not null, "grantee_id" integer null, "permission" varchar(255) not null default 'VIEW', "invite_token" varchar(255) null, "accepted_at" timestamptz null, "created_at" timestamptz not null);`);
    this.addSql(`alter table "wardrobe_share" add constraint "wardrobe_share_grantor_id_foreign" foreign key ("grantor_id") references "user" ("id") on delete cascade on update cascade;`);
    this.addSql(`alter table "wardrobe_share" add constraint "wardrobe_share_grantee_id_foreign" foreign key ("grantee_id") references "user" ("id") on delete cascade on update cascade;`);
    this.addSql(`create unique index "wardrobe_share_invite_token_unique" on "wardrobe_share" ("invite_token");`);
    this.addSql(`create index "wardrobe_share_grantor_id_index" on "wardrobe_share" ("grantor_id");`);
    this.addSql(`create index "wardrobe_share_grantee_id_index" on "wardrobe_share" ("grantee_id");`);
    this.addSql(`create unique index "wardrobe_share_grantor_grantee_unique" on "wardrobe_share" ("grantor_id", "grantee_id");`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "wardrobe_share" cascade;`);
  }

}