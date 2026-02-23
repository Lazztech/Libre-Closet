import { Module } from '@nestjs/common';
import { FileModule } from '../file/file.module';
import { OpenGraphController } from './open-graph.controller';
import { OpenGraphService } from './open-graph.service';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PasswordReset } from '../dal/entity/passwordReset.entity';
import { User } from '../dal/entity/user.entity';
import { File } from '../dal/entity/file.entity';

@Module({
  imports: [FileModule, MikroOrmModule.forFeature([PasswordReset, User, File])],
  controllers: [OpenGraphController],
  providers: [OpenGraphService],
})
export class OpenGraphModule {}
