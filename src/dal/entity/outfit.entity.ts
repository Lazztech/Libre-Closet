import {
  Collection,
  Entity,
  ManyToMany,
  ManyToOne,
  PrimaryKey,
  Property,
  type Ref,
} from '@mikro-orm/core';
import { Garment } from './garment.entity';
import { ShareableId } from './shareableId.entity';
import { User } from './user.entity';

@Entity()
export class Outfit extends ShareableId {
  @PrimaryKey()
  public id!: number;

  @Property()
  public name!: string;

  @Property({ nullable: true })
  public notes?: string;

  @ManyToMany(() => Garment, (garment) => garment.outfits, { owner: true })
  public garments = new Collection<Garment>(this);

  @ManyToOne({
    entity: () => User,
    deleteRule: 'cascade',
    ref: true,
    nullable: true,
  })
  public owner?: Ref<User>;
}
