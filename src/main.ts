import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifyCompress from '@fastify/compress';
import fastifyCookie from '@fastify/cookie';
import fastifyMultipart from '@fastify/multipart';
import fastifyView from '@fastify/view';
import hbs from 'hbs';
import type { HelperOptions } from 'handlebars';
import { join } from 'path';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import { ViewContextService } from './view-context/view-context.service';
import { GarmentColor } from './wardrobe/garment-color.enum';

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
    reply.locals = await viewContextService.buildContext(req);
  });

  // Security headers on all responses
  // eslint-disable-next-line @typescript-eslint/require-await -- Fastify onSend hook must return a Promise if not using the callback (next) pattern
  fastify.addHook('onSend', async (_request, reply, payload) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    reply.header(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    );
    reply.header(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' blob: https://static.cloudflareinsights.com; worker-src 'self' blob:; frame-ancestors 'none';",
    );
    return payload;
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
    defaultContext: {
      knownColors: JSON.stringify(Object.values(GarmentColor)),
    },
  });

  // Register partials from views/partials
  hbs.registerPartials(join(__dirname, '..', 'views', 'partials'));

  // Second view instance without a global layout for htmx partial responses.
  // @fastify/view's documented pattern for rendering templates both with and
  // without a layout: register multiple instances with different propertyName.
  // https://github.com/fastify/point-of-view#registering-multiple-engines-with-different-configurations
  await fastify.register(fastifyView, {
    engine: { handlebars: hbs },
    templates: join(__dirname, '..', 'views'),
    propertyName: 'viewPartial',
    viewExt: 'hbs',
    includeViewExtension: true,
    production: process.env.NODE_ENV === 'production',
  });

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
    'ifInArray',
    function (
      item: string,
      value: string | string[] | undefined,
      options: Handlebars.HelperOptions,
    ) {
      if (!value) return options.inverse(this);
      const arr = Array.isArray(value)
        ? value
        : value.split(',').map((s) => s.trim());
      return arr.includes(item) ? options.fn(this) : options.inverse(this);
    },
  );
  hbs.registerHelper('formatColors', function (value: string | undefined) {
    if (!value) return '';
    return value
      .split(',')
      .map((s) => s.trim())
      .join(', ');
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
