import {
  Entity,
  OneToOne,
  PrimaryKey,
  Property,
  type Ref,
} from '@mikro-orm/core';
import { User } from './user.entity';

@Entity()
export class PasswordReset {
  @PrimaryKey()
  public id!: number;

  @Property()
  public pin!: string;

  @OneToOne({
    entity: () => User,
    nullable: false,
    ref: true,
    mappedBy: 'passwordReset',
  })
  public user!: Ref<User>;
}
