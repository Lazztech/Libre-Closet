import { Migration } from '@mikro-orm/migrations';

export class Migration20260722221511 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table \`drawer\` (\`id\` integer not null primary key autoincrement, \`name\` text not null, \`notes\` text null, \`owner_id\` integer null, constraint \`drawer_owner_id_foreign\` foreign key(\`owner_id\`) references \`user\`(\`id\`) on delete cascade on update cascade);`);
    this.addSql(`create index \`drawer_owner_id_index\` on \`drawer\` (\`owner_id\`);`);

    this.addSql(`create table \`drawer_garments\` (\`drawer_id\` integer not null, \`garment_id\` integer not null, constraint \`drawer_garments_drawer_id_foreign\` foreign key(\`drawer_id\`) references \`drawer\`(\`id\`) on delete cascade on update cascade, constraint \`drawer_garments_garment_id_foreign\` foreign key(\`garment_id\`) references \`garment\`(\`id\`) on delete cascade on update cascade, primary key (\`drawer_id\`, \`garment_id\`));`);
    this.addSql(`create index \`drawer_garments_drawer_id_index\` on \`drawer_garments\` (\`drawer_id\`);`);
    this.addSql(`create index \`drawer_garments_garment_id_index\` on \`drawer_garments\` (\`garment_id\`);`);
  }

}
