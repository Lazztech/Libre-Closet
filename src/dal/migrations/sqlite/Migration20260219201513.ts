import { Migration } from '@mikro-orm/migrations';

export class Migration20260219201513 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`pragma foreign_keys = off;`);
    this.addSql(`create table \`file__temp_alter\` (\`id\` integer not null primary key autoincrement, \`shareable_id\` text not null, \`flagged\` integer null, \`banned\` integer null, \`file_name\` text not null, \`mimetype\` text null, \`created_on\` text not null, \`created_by_id\` integer null, constraint \`file_created_by_id_foreign\` foreign key(\`created_by_id\`) references \`user\`(\`id\`) on delete cascade on update cascade);`);
    this.addSql(`insert into \`file__temp_alter\` select \`id\`, \`shareable_id\`, \`flagged\`, \`banned\`, \`file_name\`, \`mimetype\`, \`created_on\`, \`created_by_id\` from \`file\`;`);
    this.addSql(`drop table \`file\`;`);
    this.addSql(`alter table \`file__temp_alter\` rename to \`file\`;`);
    this.addSql(`create unique index \`file_file_name_unique\` on \`file\` (\`file_name\`);`);
    this.addSql(`create index \`file_created_by_id_index\` on \`file\` (\`created_by_id\`);`);
    this.addSql(`pragma foreign_keys = on;`);
  }

}
