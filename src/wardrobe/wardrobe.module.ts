import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { Garment } from '../dal/entity/garment.entity';
import { Outfit } from '../dal/entity/outfit.entity';
import { OutfitSchedule } from '../dal/entity/outfit-schedule.entity';
import { User } from '../dal/entity/user.entity';
import { FileModule } from '../file/file.module';
import { AuthModule } from '../auth/auth.module';
import { GarmentService } from './garment.service';
import { OutfitService } from './outfit.service';
import { ScheduleService } from './schedule.service';
import { ScheduleController } from './schedule.controller';
import { WardrobeController } from './wardrobe.controller';
import { OutfitController } from './outfit.controller';

@Module({
  imports: [
    AuthModule,
    FileModule,
    MikroOrmModule.forFeature([Garment, Outfit, OutfitSchedule, User]),
  ],
  controllers: [WardrobeController, OutfitController, ScheduleController],
  providers: [GarmentService, OutfitService, ScheduleService],
  exports: [GarmentService, OutfitService, ScheduleService],
})
export class WardrobeModule {}
