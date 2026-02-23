import { BeforeCreate, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

export abstract class ShareableId {
  @Property()
  shareableId?: string;

  // Only fires is repostiory.create is used for before save
  @BeforeCreate()
  private addId() {
    this.shareableId = randomUUID();
  }

  // Intended to be used to indicate that it's been reported
  @Property({ nullable: true })
  public flagged?: boolean;

  @Property({ nullable: true })
  public banned?: boolean;
}
