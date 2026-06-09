import { IsEmail, IsEnum } from 'class-validator';
import { SharePermission } from '../../dal/entity/wardrobe-share.entity';

export class CreateShareDto {
  @IsEmail()
  public granteeEmail!: string;

  @IsEnum(SharePermission)
  public permission!: SharePermission;
}
