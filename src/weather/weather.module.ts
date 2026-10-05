import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { WeatherService } from './weather.service';

@Module({
  imports: [CacheModule.register()],
  providers: [WeatherService],
  exports: [WeatherService],
})
export class WeatherModule {}
