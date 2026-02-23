import { Migration } from '@mikro-orm/migrations';

export class Migration20251104025338 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table \`password_reset\` (\`id\` integer not null primary key autoincrement, \`pin\` text not null);`);

    this.addSql(`create table \`user\` (\`id\` integer not null primary key autoincrement, \`shareable_id\` text not null, \`flagged\` integer null, \`banned\` integer null, \`first_name\` text null, \`last_name\` text null, \`email\` text null, \`password\` text not null, \`password_reset_id\` integer null, constraint \`user_password_reset_id_foreign\` foreign key(\`password_reset_id\`) references \`password_reset\`(\`id\`) on delete cascade on update cascade);`);
    this.addSql(`create unique index \`user_email_unique\` on \`user\` (\`email\`);`);
    this.addSql(`create unique index \`user_password_reset_id_unique\` on \`user\` (\`password_reset_id\`);`);

    this.addSql(`create table \`file\` (\`id\` integer not null primary key autoincrement, \`shareable_id\` text not null, \`flagged\` integer null, \`banned\` integer null, \`file_name\` text not null, \`mimetype\` text null, \`created_on\` text not null, \`created_by_id\` integer not null, constraint \`file_created_by_id_foreign\` foreign key(\`created_by_id\`) references \`user\`(\`id\`) on delete cascade on update cascade);`);
    this.addSql(`create unique index \`file_file_name_unique\` on \`file\` (\`file_name\`);`);
    this.addSql(`create index \`file_created_by_id_index\` on \`file\` (\`created_by_id\`);`);

    this.addSql(`create table \`user_device\` (\`id\` integer not null primary key autoincrement, \`user_agent\` text not null, \`push_endpoint\` text not null, \`web_push_subscription\` json null, \`user_id\` integer not null, constraint \`user_device_user_id_foreign\` foreign key(\`user_id\`) references \`user\`(\`id\`) on delete cascade on update cascade);`);
    this.addSql(`create unique index \`user_device_push_endpoint_unique\` on \`user_device\` (\`push_endpoint\`);`);
    this.addSql(`create index \`user_device_user_id_index\` on \`user_device\` (\`user_id\`);`);
  }

}
