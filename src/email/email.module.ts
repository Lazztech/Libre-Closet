import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { PasswordReset } from '../dal/entity/passwordReset.entity';
import { EmailService } from './email.service';

@Module({
  imports: [MikroOrmModule.forFeature([PasswordReset])],
  controllers: [],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
