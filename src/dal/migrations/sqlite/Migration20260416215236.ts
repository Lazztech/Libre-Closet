import { Migration } from '@mikro-orm/migrations';

export class Migration20260416215236 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`pragma foreign_keys = off;`);
    this.addSql(`create table \`outfit__temp_alter\` (\`id\` integer not null primary key autoincrement, \`shareable_id\` text not null, \`flagged\` integer null, \`banned\` integer null, \`name\` text null, \`notes\` text null, \`slots\` json null, \`owner_id\` integer null, constraint \`outfit_owner_id_foreign\` foreign key(\`owner_id\`) references \`user\`(\`id\`) on delete cascade on update cascade);`);
    this.addSql(`insert into \`outfit__temp_alter\` select \`id\`, \`shareable_id\`, \`flagged\`, \`banned\`, \`name\`, \`notes\`, \`slots\`, \`owner_id\` from \`outfit\`;`);
    this.addSql(`drop table \`outfit\`;`);
    this.addSql(`alter table \`outfit__temp_alter\` rename to \`outfit\`;`);
    this.addSql(`create index \`outfit_owner_id_index\` on \`outfit\` (\`owner_id\`);`);
    this.addSql(`pragma foreign_keys = on;`);
    this.addSql(`pragma foreign_keys = off;`);
    this.addSql(`create table \`garment__temp_alter\` (\`id\` integer not null primary key autoincrement, \`shareable_id\` text not null, \`flagged\` integer null, \`banned\` integer null, \`name\` text null, \`category\` text not null, \`color\` text null, \`brand\` text null, \`size\` text null, \`notes\` text null, \`photo_id\` integer null, \`owner_id\` integer null, constraint \`garment_photo_id_foreign\` foreign key(\`photo_id\`) references \`file\`(\`id\`) on delete set null on update cascade, constraint \`garment_owner_id_foreign\` foreign key(\`owner_id\`) references \`user\`(\`id\`) on delete cascade on update cascade);`);
    this.addSql(`insert into \`garment__temp_alter\` select \`id\`, \`shareable_id\`, \`flagged\`, \`banned\`, \`name\`, \`category\`, \`color\`, \`brand\`, \`size\`, \`notes\`, \`photo_id\`, \`owner_id\` from \`garment\`;`);
    this.addSql(`drop table \`garment\`;`);
    this.addSql(`alter table \`garment__temp_alter\` rename to \`garment\`;`);
    this.addSql(`create unique index \`garment_photo_id_unique\` on \`garment\` (\`photo_id\`);`);
    this.addSql(`create index \`garment_owner_id_index\` on \`garment\` (\`owner_id\`);`);
    this.addSql(`pragma foreign_keys = on;`);
  }

}
