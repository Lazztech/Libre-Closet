import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { Garment } from '../dal/entity/garment.entity';
import { Outfit } from '../dal/entity/outfit.entity';
import { User } from '../dal/entity/user.entity';
import { FileModule } from '../file/file.module';
import { AuthModule } from '../auth/auth.module';
import { GarmentService } from './garment.service';
import { OutfitService } from './outfit.service';
import { WardrobeController } from './wardrobe.controller';
import { OutfitController } from './outfit.controller';

@Module({
  imports: [
    AuthModule,
    FileModule,
    MikroOrmModule.forFeature([Garment, Outfit, User]),
  ],
  controllers: [WardrobeController, OutfitController],
  providers: [GarmentService, OutfitService],
  exports: [GarmentService, OutfitService],
})
export class WardrobeModule {}
