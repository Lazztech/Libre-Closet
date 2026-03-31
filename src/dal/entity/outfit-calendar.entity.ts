import {
  Entity,
  ManyToOne,
  PrimaryKey,
  Property,
  type Ref,
} from '@mikro-orm/core';
import { Outfit } from './outfit.entity';
import { User } from './user.entity';

@Entity()
export class OutfitCalendar {
  @PrimaryKey()
  public id!: number;

  /** The calendar date this outfit is planned for. */
  @Property()
  public date!: Date;

  @ManyToOne({
    entity: () => Outfit,
    deleteRule: 'cascade',
    ref: true,
  })
  public outfit!: Ref<Outfit>;

  @ManyToOne({
    entity: () => User,
    deleteRule: 'cascade',
    ref: true,
    nullable: true,
  })
  public owner?: Ref<User>;

  /**
   * Null until the user marks this entry as worn.
   * Set to the actual wear date (may differ from `date` if rescheduled).
   */
  @Property({ nullable: true })
  public wornAt?: Date;

  @Property({ nullable: true })
  public notes?: string;
}
