import { EntityManager } from '@mikro-orm/core';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import hbs from 'hbs';
import path from 'path';
import { PasswordReset } from '../dal/entity/passwordReset.entity';
import { User } from '../dal/entity/user.entity';
import { EmailService } from '../email/email.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DisableRegistrationGuard } from './disable-registration.guard';

describe('AuthController', () => {
  let app: NestFastifyApplication;
  let controller: AuthController;
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    configService = { get: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'dummyaccesstoken',
        }),
      ],
      controllers: [AuthController],
      providers: [
        DisableRegistrationGuard,
        { provide: ConfigService, useValue: configService },
        AuthService,
        EmailService,
        {
          provide: EntityManager,
          useValue: {
            query: jest.fn(),
            // you can mock other functions inside
            // the entity manager object, my case only needed query method
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

    app = module.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    app.setViewEngine({
      engine: { handlebars: hbs },
      templates: path.join(process.cwd(), 'views'),
      viewExt: 'hbs',
      layout: 'layout',
      includeViewExtension: true,
    });

    await new Promise<void>((resolve, reject) => {
      hbs.registerPartials(
        path.join(process.cwd(), 'views', 'partials'),
        (err) => {
          if (err) reject(err instanceof Error ? err : new Error(String(err)));
          else resolve();
        },
      );
    });
    hbs.registerHelper('t', (key: string) => key);
    hbs.registerHelper('filterErrors', () => []);
    hbs.registerHelper('json', () => '');
    hbs.registerHelper('ifEquals', function (a, b, options) {
      return a == b ? options.fn(this) : options.inverse(this);
    });
    hbs.registerHelper('uri', (str: string) =>
      encodeURIComponent(String(str ?? '')),
    );
    hbs.registerHelper('join', () => '');
    hbs.registerHelper('ifContains', function (arr, value, options) {
      return Array.isArray(arr) && arr.includes(value)
        ? options.fn(this)
        : options.inverse(this);
    });

    const fastify = app.getHttpAdapter().getInstance();
    fastify.decorateReply('locals', null);
    fastify.addHook('preHandler', async (req, reply) => {
      (reply as any).locals = {
        locale: 'en',
        appName: 'Test',
        baseUrl: '',
        authEnabled: configService.get('AUTH_ENABLED'),
        signupsDisabled: configService.get('DISABLE_REGISTRATION'),
      };
    });

    await app.init();
    await fastify.ready();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('GET /auth/register redirects to login when DISABLE_REGISTRATION=true', async () => {
    configService.get.mockImplementation((key: string) =>
      key === 'DISABLE_REGISTRATION' ? true : undefined,
    );

    const res = await app.inject({
      method: 'GET',
      url: '/auth/register',
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/auth/login');
  });

  it('GET /auth/register renders when DISABLE_REGISTRATION=false', async () => {
    configService.get.mockImplementation((key: string) =>
      key === 'DISABLE_REGISTRATION' ? false : undefined,
    );

    const res = await app.inject({
      method: 'GET',
      url: '/auth/register',
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers.location).toBeUndefined();
  });
});
