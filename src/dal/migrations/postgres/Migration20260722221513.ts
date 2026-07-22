import { Migration } from '@mikro-orm/migrations';

export class Migration20260722221513 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "drawer" ("id" serial primary key, "name" varchar(255) not null, "notes" varchar(255) null, "owner_id" int null);`);

    this.addSql(`create table "drawer_garments" ("drawer_id" int not null, "garment_id" int not null, constraint "drawer_garments_pkey" primary key ("drawer_id", "garment_id"));`);

    this.addSql(`alter table "drawer" add constraint "drawer_owner_id_foreign" foreign key ("owner_id") references "user" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "drawer_garments" add constraint "drawer_garments_drawer_id_foreign" foreign key ("drawer_id") references "drawer" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "drawer_garments" add constraint "drawer_garments_garment_id_foreign" foreign key ("garment_id") references "garment" ("id") on update cascade on delete cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "drawer_garments" drop constraint "drawer_garments_drawer_id_foreign";`);

    this.addSql(`alter table "drawer_garments" drop constraint "drawer_garments_garment_id_foreign";`);

    this.addSql(`drop table if exists "drawer" cascade;`);

    this.addSql(`drop table if exists "drawer_garments" cascade;`);
  }

}
