import { Migration } from '@mikro-orm/migrations';

export class Migration20260609060600 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table \`wardrobe_share\` (\`id\` integer not null primary key autoincrement, \`grantor_id\` integer not null, \`grantee_id\` integer null, \`permission\` text not null default 'VIEW', \`invite_token\` text null, \`accepted_at\` datetime null, \`created_at\` datetime not null, constraint \`wardrobe_share_grantor_id_foreign\` foreign key(\`grantor_id\`) references \`user\`(\`id\`) on delete cascade on update cascade, constraint \`wardrobe_share_grantee_id_foreign\` foreign key(\`grantee_id\`) references \`user\`(\`id\`) on delete cascade on update cascade);`);
    this.addSql(`create unique index \`wardrobe_share_invite_token_unique\` on \`wardrobe_share\` (\`invite_token\`);`);
    this.addSql(`create index \`wardrobe_share_grantor_id_index\` on \`wardrobe_share\` (\`grantor_id\`);`);
    this.addSql(`create index \`wardrobe_share_grantee_id_index\` on \`wardrobe_share\` (\`grantee_id\`);`);
    this.addSql(`create unique index \`wardrobe_share_grantor_grantee_unique\` on \`wardrobe_share\` (\`grantor_id\`, \`grantee_id\`);`);
  }

}