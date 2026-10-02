import { Migration } from '@mikro-orm/migrations';

export class Migration20260612010037 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table \`wardrobe_share\` (\`id\` integer not null primary key autoincrement, \`grantor_id\` integer not null, \`grantee_id\` integer null, \`permission\` text not null default 'VIEW', \`invite_token\` text null, \`accepted_at\` datetime null, \`created_at\` datetime not null, constraint \`wardrobe_share_grantor_id_foreign\` foreign key(\`grantor_id\`) references \`user\`(\`id\`) on delete cascade on update cascade, constraint \`wardrobe_share_grantee_id_foreign\` foreign key(\`grantee_id\`) references \`user\`(\`id\`) on delete cascade on update cascade);`);
    this.addSql(`create index \`wardrobe_share_grantor_id_index\` on \`wardrobe_share\` (\`grantor_id\`);`);
    this.addSql(`create index \`wardrobe_share_grantee_id_index\` on \`wardrobe_share\` (\`grantee_id\`);`);
    this.addSql(`create unique index \`wardrobe_share_invite_token_unique\` on \`wardrobe_share\` (\`invite_token\`);`);
    this.addSql(`create unique index \`wardrobe_share_grantor_id_grantee_id_unique\` on \`wardrobe_share\` (\`grantor_id\`, \`grantee_id\`);`);

    // `pragma foreign_keys = off` is a no-op inside a transaction, and migrations
    // run transactionally. FK enforcement therefore stays on, and the `drop table
    // \`garment\`` below cascade-deletes every `outfit_garments` row (see #129).
    // Stash the join rows and put them back once `garment` has been rebuilt.
    this.addSql(`create table \`outfit_garments__129_backup\` (\`outfit_id\` integer not null, \`garment_id\` integer not null);`);
    this.addSql(`insert into \`outfit_garments__129_backup\` select \`outfit_id\`, \`garment_id\` from \`outfit_garments\`;`);

    this.addSql(`pragma foreign_keys = off;`);
    this.addSql(`create table \`garment__temp_alter\` (\`id\` integer not null primary key autoincrement, \`shareable_id\` text not null, \`flagged\` integer null, \`banned\` integer null, \`name\` text null, \`category\` text not null, \`color\` integer null, \`brand\` text null, \`size\` text null, \`notes\` text null, \`photo_id\` integer null, \`owner_id\` integer null, constraint \`garment_photo_id_foreign\` foreign key(\`photo_id\`) references \`file\`(\`id\`) on delete set null on update cascade, constraint \`garment_owner_id_foreign\` foreign key(\`owner_id\`) references \`user\`(\`id\`) on delete cascade on update cascade);`);
    this.addSql(`insert into \`garment__temp_alter\` select \`id\`, \`shareable_id\`, \`flagged\`, \`banned\`, \`name\`, \`category\`, \`color\`, \`brand\`, \`size\`, \`notes\`, \`photo_id\`, \`owner_id\` from \`garment\`;`);
    this.addSql(`drop table \`garment\`;`);
    this.addSql(`alter table \`garment__temp_alter\` rename to \`garment\`;`);
    this.addSql(`create unique index \`garment_photo_id_unique\` on \`garment\` (\`photo_id\`);`);
    this.addSql(`create index \`garment_owner_id_index\` on \`garment\` (\`owner_id\`);`);
    this.addSql(`pragma foreign_keys = on;`);

    // `insert or ignore` so this stays correct if the pragma ever does take
    // effect: the rows would still be there and the restore becomes a no-op.
    this.addSql(`insert or ignore into \`outfit_garments\` (\`outfit_id\`, \`garment_id\`) select \`outfit_id\`, \`garment_id\` from \`outfit_garments__129_backup\`;`);
    this.addSql(`drop table \`outfit_garments__129_backup\`;`);
  }

}
