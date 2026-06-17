import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifyCompress from '@fastify/compress';
import fastifyCookie from '@fastify/cookie';
import fastifyMultipart from '@fastify/multipart';
import hbs from 'hbs';
import type { HelperOptions } from 'handlebars';
import { join } from 'path';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import { ViewContextService } from './view-context/view-context.service';

async function bootstrap() {
  // https://docs.nestjs.com/security/rate-limiting#proxies
  const adapter = new FastifyAdapter({ trustProxy: ['127.0.0.1', '::1'] }); // Trust requests from the loopback address
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
    {
      bufferLogs: true,
    },
  );
  app.useLogger(app.get(Logger));

  // Express-like res.locals equivalent? https://github.com/fastify/fastify/issues/303
  const viewContextService = app.get(ViewContextService);
  const fastify = app.getHttpAdapter().getInstance();
  fastify.decorateReply('locals', null);
  fastify.addHook('preHandler', async (req, reply) => {
    (reply as any).locals = await viewContextService.buildContext(req);
  });

  await app.register(fastifyCookie);
  // https://docs.nestjs.com/techniques/compression
  await app.register(fastifyCompress);
  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB
      files: 5,
    },
  });

  app.useStaticAssets({
    root: join(__dirname, '..', 'public'),
    decorateReply: false,
  });

  /** Serve htmx and other libraries from node_modules
   * https://htmx.org/docs/#installing
   * https://blog.wesleyac.com/posts/why-not-javascript-cdn */
  app.useStaticAssets({
    root: [
      join(__dirname, '..', 'node_modules/htmx.org/dist'),
      join(__dirname, '..', 'node_modules/htmx-ext-sse/'),
      join(__dirname, '..', 'node_modules/hyperscript.org/dist'),
      join(__dirname, '..', 'node_modules/@khmyznikov/pwa-install/dist'),
      join(__dirname, '..', 'node_modules/workbox-window/build'),
      join(__dirname, '..', 'node_modules/sortablejs'),
    ],
    prefix: '/modules/',
    decorateReply: false,
  });

  app.useStaticAssets({
    root: join(__dirname, '..', 'node_modules/pulltorefreshjs/dist'),
    prefix: '/modules/pulltorefresh',
    decorateReply: false,
  });
  app.useStaticAssets({
    root: join(__dirname, '..', 'node_modules/@imgly/background-removal/dist'),
    prefix: '/modules/background-removal',
    decorateReply: false,
  });
  app.useStaticAssets({
    root: join(__dirname, '..', 'node_modules/onnxruntime-web'),
    prefix: '/modules/onnxruntime-web',
    decorateReply: false,
  });
  app.useStaticAssets({
    root: join(
      __dirname,
      '..',
      'node_modules/@imgly/background-removal-data/dist',
    ),
    prefix: '/bg-removal-models',
    decorateReply: false,
  });

  // Setup MVC https://docs.nestjs.com/techniques/mvc
  app.setViewEngine({
    engine: { handlebars: hbs },
    templates: join(__dirname, '..', 'views'),
    viewExt: 'hbs',
    layout: 'layout',
    includeViewExtension: true,
  });

  // Register partials from views/partials
  hbs.registerPartials(join(__dirname, '..', 'views', 'partials'));

  // Register handlebars helpers after engine setup
  hbs.registerHelper(
    'filterErrors',
    function (
      errors: { property: string; constraints?: Record<string, string> }[],
      property: string,
    ) {
      // Check if errors exists and is an array
      if (!errors || !Array.isArray(errors)) {
        return;
      }
      return errors
        .filter((error) => error.property === property)
        .flatMap((e) => Object.values(e.constraints || {}));
    },
  );
  hbs.registerHelper('json', function (context: unknown) {
    return JSON.stringify(context);
  });
  hbs.registerHelper(
    'ifEquals',
    function (arg1: unknown, arg2: unknown, options: HelperOptions) {
      return arg1 == arg2 ? options.fn(this) : options.inverse(this);
    },
  );
  hbs.registerHelper('formatDate', (date: string | Date | undefined) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return d.toISOString().split('T')[0];
  });
  hbs.registerHelper('uri', (str: string) =>
    encodeURIComponent(String(str ?? '')),
  );
  hbs.registerHelper('join', function (arr: unknown[], separator: string) {
    if (!Array.isArray(arr)) return '';
    return arr.join(separator ?? ', ');
  });
  hbs.registerHelper(
    'ifContains',
    function (arr: unknown[], value: unknown, options) {
      if (!Array.isArray(arr)) return options.inverse(this);
      return arr.includes(value) ? options.fn(this) : options.inverse(this);
    },
  );

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
