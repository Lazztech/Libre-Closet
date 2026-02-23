import {
  Entity,
  ManyToOne,
  PrimaryKey,
  Property,
  Unique,
  type Ref,
} from '@mikro-orm/core';
import webpush from 'web-push';
import { User } from './user.entity';

@Entity()
export class UserDevice {
  @PrimaryKey()
  public id!: number;

  @Property()
  public userAgent?: string;

  @Property()
  @Unique()
  public pushEndpoint!: string; // taken from webPushSubscription as a unique device identifier

  @Property({ type: 'json', nullable: true })
  webPushSubscription?: webpush.PushSubscription;

  @ManyToOne({
    entity: () => User,
    deleteRule: 'cascade',
    ref: true,
  })
  public user!: Ref<User>;
}
