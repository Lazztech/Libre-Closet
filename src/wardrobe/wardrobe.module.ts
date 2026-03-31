import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { Garment } from '../dal/entity/garment.entity';
import { Outfit } from '../dal/entity/outfit.entity';
import { OutfitCalendar } from '../dal/entity/outfit-calendar.entity';
import { User } from '../dal/entity/user.entity';
import { FileModule } from '../file/file.module';
import { AuthModule } from '../auth/auth.module';
import { GarmentService } from './garment.service';
import { OutfitService } from './outfit.service';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';
import { WardrobeController } from './wardrobe.controller';
import { OutfitController } from './outfit.controller';

@Module({
  imports: [
    AuthModule,
    FileModule,
    MikroOrmModule.forFeature([Garment, Outfit, OutfitCalendar, User]),
  ],
  controllers: [WardrobeController, OutfitController, CalendarController],
  providers: [GarmentService, OutfitService, CalendarService],
  exports: [GarmentService, OutfitService, CalendarService],
})
export class WardrobeModule {}
