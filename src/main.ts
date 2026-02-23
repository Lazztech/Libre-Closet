import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import hbs from 'hbs';
import { join } from 'path';
import { AppModule } from './app.module';
import { ValidationError } from '@nestjs/common';
import { ErrorViewFilter } from './error-view.filter';
import compression from 'compression';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));

  // https://docs.nestjs.com/security/rate-limiting#proxies
  app.set('trust proxy', 'loopback'); // Trust requests from the loopback address

  app.use(cookieParser());

  // https://docs.nestjs.com/techniques/compression
  app.use(compression());

  // Setup MVC https://docs.nestjs.com/techniques/mvc
  app.useStaticAssets(join(__dirname, '..', 'public'));
  app.setBaseViewsDir(join(__dirname, '..', 'views'));
  app.setViewEngine('hbs');
  app.set('view cache', process.env.NODE_ENV === 'production');
  hbs.registerPartials(join(__dirname, '..', 'views', 'partials'));
  hbs.registerHelper(
    'filterErrors',
    function (errors: ValidationError[], property) {
      // Check if errors exists and is an array
      if (!errors || !Array.isArray(errors)) {
        return;
      }
      return errors
        ?.filter((error) => error.property === property)
        .flatMap((e) => Object.values(e.constraints || {}));
    },
  );
  hbs.registerHelper('json', function (context) {
    return JSON.stringify(context);
  });
  hbs.registerHelper('ifEquals', function (arg1, arg2, options) {
    return arg1 == arg2 ? options.fn(this) : options.inverse(this);
  });

  /** Serve htmx and other libraries from node_modules
   * https://htmx.org/docs/#installing
   * https://blog.wesleyac.com/posts/why-not-javascript-cdn */
  app.useStaticAssets(join(__dirname, '..', 'node_modules/htmx.org/dist'), {
    prefix: '/modules/',
  });
  app.useStaticAssets(join(__dirname, '..', 'node_modules/htmx-ext-sse/'), {
    prefix: '/modules/',
  });
  app.useStaticAssets(
    join(__dirname, '..', 'node_modules/hyperscript.org/dist'),
    {
      prefix: '/modules/',
    },
  );
  app.useStaticAssets(
    join(__dirname, '..', 'node_modules/@khmyznikov/pwa-install/dist'),
    {
      prefix: '/modules/',
    },
  );
  app.useStaticAssets(
    join(__dirname, '..', 'node_modules/workbox-window/build'),
    {
      prefix: '/modules/',
    },
  );

  app.useGlobalFilters(new ErrorViewFilter());
  await app.listen(process.env.PORT ?? 3000);
}
// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
