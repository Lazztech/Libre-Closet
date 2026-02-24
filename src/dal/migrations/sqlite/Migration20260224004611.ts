import { Migration } from '@mikro-orm/migrations';

export class Migration20260224004611 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table \`outfit\` (\`id\` integer not null primary key autoincrement, \`shareable_id\` text not null, \`flagged\` integer null, \`banned\` integer null, \`name\` text not null, \`notes\` text null, \`owner_id\` integer null, constraint \`outfit_owner_id_foreign\` foreign key(\`owner_id\`) references \`user\`(\`id\`) on delete cascade on update cascade);`);
    this.addSql(`create index \`outfit_owner_id_index\` on \`outfit\` (\`owner_id\`);`);

    this.addSql(`create table \`garment\` (\`id\` integer not null primary key autoincrement, \`shareable_id\` text not null, \`flagged\` integer null, \`banned\` integer null, \`name\` text not null, \`category\` text not null, \`brand\` text null, \`colors\` json null, \`size\` text null, \`notes\` text null, \`photo_id\` integer null, \`owner_id\` integer null, constraint \`garment_photo_id_foreign\` foreign key(\`photo_id\`) references \`file\`(\`id\`) on delete set null on update cascade, constraint \`garment_owner_id_foreign\` foreign key(\`owner_id\`) references \`user\`(\`id\`) on delete cascade on update cascade);`);
    this.addSql(`create unique index \`garment_photo_id_unique\` on \`garment\` (\`photo_id\`);`);
    this.addSql(`create index \`garment_owner_id_index\` on \`garment\` (\`owner_id\`);`);

    this.addSql(`create table \`outfit_garments\` (\`outfit_id\` integer not null, \`garment_id\` integer not null, constraint \`outfit_garments_outfit_id_foreign\` foreign key(\`outfit_id\`) references \`outfit\`(\`id\`) on delete cascade on update cascade, constraint \`outfit_garments_garment_id_foreign\` foreign key(\`garment_id\`) references \`garment\`(\`id\`) on delete cascade on update cascade, primary key (\`outfit_id\`, \`garment_id\`));`);
    this.addSql(`create index \`outfit_garments_outfit_id_index\` on \`outfit_garments\` (\`outfit_id\`);`);
    this.addSql(`create index \`outfit_garments_garment_id_index\` on \`outfit_garments\` (\`garment_id\`);`);
  }

}
