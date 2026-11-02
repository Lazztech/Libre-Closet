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
import { GarmentColor } from '../../wardrobe/garment-color.enum';

export { GarmentColor };

@Entity()
export class Garment extends ShareableId {
  @PrimaryKey()
  public id!: number;

  @Property({ nullable: true })
  public name?: string;

  @Property()
  public category!: string;

  @Property({ nullable: true })
  public subCategory?: string;

  @Property({ nullable: true, columnType: 'text' })
  public color?: string;

  @Property({ nullable: true })
  public brand?: string;

  @Property({ nullable: true })
  public size?: string;

  @Property({ type: Date, nullable: true })
  public dateAquired?: Date;

  @Property({ nullable: true })
  public notes?: string;

  @Property({ default: false })
  public archived = false;
  @Property({ nullable: true, columnType: 'text' })
  public washingDetails?: string;

  @OneToOne({
    entity: () => File,
    nullable: true,
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

  @Property({ nullable: true })
  public rating?: number;

  @Property({ nullable: true })
  public seasons?: string;

  @Property({ nullable: true })
  public occasions?: string;

  @Property({ nullable: true })
  public purchaseLink?: string;

  @Property({ nullable: true, columnType: 'numeric(12,2)' })
  public cost?: number;

  @Property({ nullable: true })
  public print?: string;

  @Property({ nullable: true })
  public look?: string;

  @Property({ nullable: true })
  public fit?: string;
}
