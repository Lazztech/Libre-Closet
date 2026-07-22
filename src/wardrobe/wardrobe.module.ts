import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { Drawer } from '../dal/entity/drawer.entity';
import { Garment } from '../dal/entity/garment.entity';
import { Outfit } from '../dal/entity/outfit.entity';
import { OutfitCalendar } from '../dal/entity/outfit-calendar.entity';
import { User } from '../dal/entity/user.entity';
import { FileModule } from '../file/file.module';
import { AuthModule } from '../auth/auth.module';
import { WardrobeShareModule } from '../wardrobe-share/wardrobe-share.module';
import { GarmentService } from './garment.service';
import { OutfitService } from './outfit.service';
import { CalendarService } from './calendar.service';
import { DrawerService } from './drawer.service';
import { CalendarController } from './calendar.controller';
import { WardrobeController } from './wardrobe.controller';
import { OutfitController } from './outfit.controller';
import { DrawerController } from './drawer.controller';

@Module({
  imports: [
    AuthModule,
    FileModule,
    WardrobeShareModule,
    MikroOrmModule.forFeature([Garment, Outfit, OutfitCalendar, Drawer, User]),
  ],
  controllers: [
    WardrobeController,
    OutfitController,
    CalendarController,
    DrawerController,
  ],
  providers: [GarmentService, OutfitService, CalendarService, DrawerService],
  exports: [GarmentService, OutfitService, CalendarService, DrawerService],
})
export class WardrobeModule {}
