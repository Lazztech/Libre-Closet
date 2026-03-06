import { Migration } from '@mikro-orm/migrations';

export class Migration20260305215234 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "password_reset" ("id" serial primary key, "pin" varchar(255) not null);`);

    this.addSql(`create table "user" ("id" serial primary key, "shareable_id" varchar(255) not null, "flagged" boolean null, "banned" boolean null, "first_name" varchar(255) null, "last_name" varchar(255) null, "email" varchar(255) null, "password" varchar(255) not null, "password_reset_id" int null);`);
    this.addSql(`alter table "user" add constraint "user_email_unique" unique ("email");`);
    this.addSql(`alter table "user" add constraint "user_password_reset_id_unique" unique ("password_reset_id");`);

    this.addSql(`create table "outfit" ("id" serial primary key, "shareable_id" varchar(255) not null, "flagged" boolean null, "banned" boolean null, "name" varchar(255) not null, "notes" varchar(255) null, "owner_id" int null);`);

    this.addSql(`create table "file" ("id" serial primary key, "shareable_id" varchar(255) not null, "flagged" boolean null, "banned" boolean null, "file_name" varchar(255) not null, "mimetype" varchar(255) null, "created_on" varchar(255) not null, "created_by_id" int null);`);
    this.addSql(`alter table "file" add constraint "file_file_name_unique" unique ("file_name");`);

    this.addSql(`create table "garment" ("id" serial primary key, "shareable_id" varchar(255) not null, "flagged" boolean null, "banned" boolean null, "name" varchar(255) not null, "category" varchar(255) not null, "brand" varchar(255) null, "colors" jsonb null, "size" varchar(255) null, "notes" varchar(255) null, "photo_id" int null, "owner_id" int null);`);
    this.addSql(`alter table "garment" add constraint "garment_photo_id_unique" unique ("photo_id");`);

    this.addSql(`create table "outfit_garments" ("outfit_id" int not null, "garment_id" int not null, constraint "outfit_garments_pkey" primary key ("outfit_id", "garment_id"));`);

    this.addSql(`create table "user_device" ("id" serial primary key, "user_agent" varchar(255) not null, "push_endpoint" varchar(255) not null, "web_push_subscription" jsonb null, "user_id" int not null);`);
    this.addSql(`alter table "user_device" add constraint "user_device_push_endpoint_unique" unique ("push_endpoint");`);

    this.addSql(`alter table "user" add constraint "user_password_reset_id_foreign" foreign key ("password_reset_id") references "password_reset" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "outfit" add constraint "outfit_owner_id_foreign" foreign key ("owner_id") references "user" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "file" add constraint "file_created_by_id_foreign" foreign key ("created_by_id") references "user" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "garment" add constraint "garment_photo_id_foreign" foreign key ("photo_id") references "file" ("id") on update cascade on delete set null;`);
    this.addSql(`alter table "garment" add constraint "garment_owner_id_foreign" foreign key ("owner_id") references "user" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "outfit_garments" add constraint "outfit_garments_outfit_id_foreign" foreign key ("outfit_id") references "outfit" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "outfit_garments" add constraint "outfit_garments_garment_id_foreign" foreign key ("garment_id") references "garment" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "user_device" add constraint "user_device_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "user" drop constraint "user_password_reset_id_foreign";`);

    this.addSql(`alter table "outfit" drop constraint "outfit_owner_id_foreign";`);

    this.addSql(`alter table "file" drop constraint "file_created_by_id_foreign";`);

    this.addSql(`alter table "garment" drop constraint "garment_owner_id_foreign";`);

    this.addSql(`alter table "user_device" drop constraint "user_device_user_id_foreign";`);

    this.addSql(`alter table "outfit_garments" drop constraint "outfit_garments_outfit_id_foreign";`);

    this.addSql(`alter table "garment" drop constraint "garment_photo_id_foreign";`);

    this.addSql(`alter table "outfit_garments" drop constraint "outfit_garments_garment_id_foreign";`);

    this.addSql(`drop table if exists "password_reset" cascade;`);

    this.addSql(`drop table if exists "user" cascade;`);

    this.addSql(`drop table if exists "outfit" cascade;`);

    this.addSql(`drop table if exists "file" cascade;`);

    this.addSql(`drop table if exists "garment" cascade;`);

    this.addSql(`drop table if exists "outfit_garments" cascade;`);

    this.addSql(`drop table if exists "user_device" cascade;`);
  }

}
