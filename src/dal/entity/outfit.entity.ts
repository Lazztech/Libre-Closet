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

export interface OutfitSlot {
  category: string;
  garmentId: number | null;
}

@Entity()
export class Outfit extends ShareableId {
  @PrimaryKey()
  public id!: number;

  @Property({ nullable: true })
  public name?: string;

  @Property({ nullable: true })
  public notes?: string;

  @Property({ type: 'json', nullable: true })
  public slots?: OutfitSlot[];

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
