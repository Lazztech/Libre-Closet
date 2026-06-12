import { Migration } from '@mikro-orm/migrations';

export class Migration20260612010041 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "wardrobe_share" ("id" serial primary key, "grantor_id" int not null, "grantee_id" int null, "permission" varchar(255) not null default 'VIEW', "invite_token" varchar(255) null, "accepted_at" timestamptz null, "created_at" timestamptz not null);`);
    this.addSql(`alter table "wardrobe_share" add constraint "wardrobe_share_invite_token_unique" unique ("invite_token");`);
    this.addSql(`alter table "wardrobe_share" add constraint "wardrobe_share_grantor_id_grantee_id_unique" unique ("grantor_id", "grantee_id");`);

    this.addSql(`alter table "wardrobe_share" add constraint "wardrobe_share_grantor_id_foreign" foreign key ("grantor_id") references "user" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "wardrobe_share" add constraint "wardrobe_share_grantee_id_foreign" foreign key ("grantee_id") references "user" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "garment" alter column "color" type smallint using ("color"::smallint);`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "wardrobe_share" cascade;`);

    this.addSql(`alter table "garment" alter column "color" type varchar(255) using ("color"::varchar(255));`);
  }

}
