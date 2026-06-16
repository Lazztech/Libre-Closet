import { EntityManager } from '@mikro-orm/core';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { PasswordReset } from '../dal/entity/passwordReset.entity';
import { User } from '../dal/entity/user.entity';
import { EmailService } from '../email/email.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegistrationGuard } from './registration.guard';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'dummyaccesstoken',
        }),
      ],
      controllers: [AuthController],
      providers: [
        ConfigService,
        AuthService,
        EmailService,
        {
          provide: EntityManager,
          useValue: {
            query: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            persistAndFlush: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PasswordReset),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            persistAndFlush: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('RegistrationGuard', () => {
    const guardedMethods = [
      'postRegister',
      'postRegisterValidate',
      'getRegister',
    ];

    guardedMethods.forEach((method) => {
      it(`applies RegistrationGuard to ${method}`, () => {
        const guards: any[] =
          Reflect.getMetadata('__guards__', controller[method]) ?? [];
        const guardTypes = guards.map((g: any) =>
          typeof g === 'function' ? g : g.constructor,
        );
        expect(guardTypes).toContain(RegistrationGuard);
      });
    });
  });
});
