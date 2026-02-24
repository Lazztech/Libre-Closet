import {
  Collection,
  Entity,
  ManyToMany,
  ManyToOne,
  OneToOne,
  PrimaryKey,
  Property,
  type Ref,
} from '@mikro-orm/core';
import { File } from './file.entity';
import { Outfit } from './outfit.entity';
import { ShareableId } from './shareableId.entity';
import { User } from './user.entity';

export enum GarmentCategory {
  TOPS = 'tops',
  BOTTOMS = 'bottoms',
  DRESSES = 'dresses',
  OUTERWEAR = 'outerwear',
  FOOTWEAR = 'footwear',
  ACCESSORIES = 'accessories',
  BAGS = 'bags',
  ACTIVEWEAR = 'activewear',
  SWIMWEAR = 'swimwear',
  UNDERWEAR = 'underwear',
  OTHER = 'other',
}

@Entity()
export class Garment extends ShareableId {
  @PrimaryKey()
  public id!: number;

  @Property()
  public name!: string;

  @Property()
  public category!: GarmentCategory;

  @Property({ nullable: true })
  public brand?: string;

  @Property({ type: 'json', nullable: true })
  public colors?: string[];

  @Property({ nullable: true })
  public size?: string;

  @Property({ nullable: true })
  public notes?: string;

  @OneToOne({
    entity: () => File,
    nullable: true,
    ref: true,
  })
  public photo?: Ref<File>;

  @ManyToOne({
    entity: () => User,
    deleteRule: 'cascade',
    ref: true,
    nullable: true,
  })
  public owner?: Ref<User>;

  @ManyToMany(() => Outfit, (outfit) => outfit.garments)
  public outfits = new Collection<Outfit>(this);
}
