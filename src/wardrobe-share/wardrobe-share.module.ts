import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { WardrobeShare } from '../dal/entity/wardrobe-share.entity';
import { User } from '../dal/entity/user.entity';
import { AuthModule } from '../auth/auth.module';
import { WardrobeShareController } from './wardrobe-share.controller';
import { WardrobeShareService } from './wardrobe-share.service';

@Module({
  imports: [MikroOrmModule.forFeature([WardrobeShare, User]), AuthModule],
  controllers: [WardrobeShareController],
  providers: [WardrobeShareService],
  exports: [WardrobeShareService],
})
export class WardrobeShareModule {}
