import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { User } from '../dal/entity/user.entity';
import { ViewContextService } from './view-context.service';

@Module({
  imports: [MikroOrmModule.forFeature([User])],
  providers: [ViewContextService],
  exports: [ViewContextService],
})
export class ViewContextModule {}
