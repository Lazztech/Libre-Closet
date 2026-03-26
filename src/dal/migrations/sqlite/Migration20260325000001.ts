import { Migration } from '@mikro-orm/migrations';

export class Migration20260325000001 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table \`outfit_schedule\` (\`id\` integer not null primary key autoincrement, \`date\` datetime not null, \`outfit_id\` integer not null, \`owner_id\` integer null, \`worn_at\` datetime null, \`notes\` text null, constraint \`outfit_schedule_outfit_id_foreign\` foreign key(\`outfit_id\`) references \`outfit\`(\`id\`) on delete cascade on update cascade, constraint \`outfit_schedule_owner_id_foreign\` foreign key(\`owner_id\`) references \`user\`(\`id\`) on delete cascade on update cascade);`);
    this.addSql(`create index \`outfit_schedule_outfit_id_index\` on \`outfit_schedule\` (\`outfit_id\`);`);
    this.addSql(`create index \`outfit_schedule_owner_id_index\` on \`outfit_schedule\` (\`owner_id\`);`);
  }

}
