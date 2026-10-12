import {
  Collection,
  Entity,
  Enum,
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

  @Enum({ nullable: true })
  public color?: GarmentColor;

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

  /**
   * Default canvas transform for this garment on the 1000x1000 outfit canvas.
   * Outfit slots may override these values.
   */
  @Property({ default: 500 })
  public canvasPositionX = 500;

  @Property({ default: 500 })
  public canvasPositionY = 500;

  @Property({ default: 0 })
  public canvasRotation = 0;

  @Property({ default: 1 })
  public canvasScale = 1;
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
}
