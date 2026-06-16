import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { ConditionalAuthGuard } from './conditional-auth.guard';
import { RegistrationGuard } from './registration.guard';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { User } from '../dal/entity/user.entity';
import { PasswordReset } from '../dal/entity/passwordReset.entity';
import { EmailModule } from '../email/email.module';
import { ViewContextModule } from '../view-context/view-context.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('ACCESS_TOKEN_SECRET'),
        signOptions: { expiresIn: '365d' },
      }),
    }),
    MikroOrmModule.forFeature([PasswordReset, User]),
    EmailModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthGuard,
    ConditionalAuthGuard,
    RegistrationGuard,
    ViewContextModule,
  ],
  exports: [JwtModule, AuthService, AuthGuard, ConditionalAuthGuard],
})
export class AuthModule {}
