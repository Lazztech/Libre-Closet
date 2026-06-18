import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Render,
  Req,
  Res,
  Sse,
} from '@nestjs/common';
import { Subject } from 'rxjs';
import { AppService } from './app.service';
import { I18n, I18nContext } from 'nestjs-i18n';
import { FastifyReply, FastifyRequest } from 'fastify';

@Controller()
export class AppController {
  private logger = new Logger(AppController.name);

  private message$ = new Subject<string>();

  constructor(private readonly appService: AppService) {}

  @Get()
  @Render('index')
  index(@I18n() i18n: I18nContext) {
    return { pageTitle: i18n.t('lang.PAGE_TITLE_HOME') };
  }

  @Get('chat')
  @Render('chat')
  getChat(): any {
    return {
      message: this.appService.getHello(),
    };
  }

  @Get('offline.html')
  @Render('offline')
  getOffline() {}

  @Sse('sse')
  getChatStream() {
    return this.message$;
  }

  @Post('message')
  async postMessages(@Body() body: any) {
    const message = body.message as string;
    this.message$.next(`
      <div class='chat chat-end'>
        <div class='chat-header'>
          User
        </div>
        <div class='chat-bubble'>${message}</div>
      </div>
      `);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    this.message$.next(`
      <div class='chat chat-start'>
        <div class='chat-header'>
          Assistant
        </div>
        <div class='chat-bubble'>1</div>
      </div>
      `);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    this.message$.next(`
      <div class='chat chat-start'>
        <div class='chat-header'>
          Assistant
        </div>
        <div class='chat-bubble'>2</div>
      </div>
      `);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    this.message$.next(`
      <div class='chat chat-start'>
        <div class='chat-header'>
          Assistant
        </div>
        <div class='chat-bubble'>3</div>
      </div>
      `);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    this.message$.next(`
      <div class='chat chat-start'>
        <div class='chat-header'>
          Assistant
        </div>
        <div class='chat-bubble'>Hello World</div>
      </div>
      `);
    this.logger.debug(`done with ${this.postMessages.name}`);
  }

  @Get('.well-known/*')
  well_known() {
    return {}; // Just return empty object
  }

  @Get('sitemap.xml')
  sitemap(@Req() req: FastifyRequest, @Res() reply: FastifyReply): void {
    const protocol =
      (req.headers['x-forwarded-proto'] as string) ?? req.protocol;
    const host = (req.headers['x-forwarded-host'] as string) ?? req.host;
    const baseUrl = `${protocol}://${host}`;
    reply.header('Content-Type', 'application/xml; charset=utf-8');
    reply.send(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/auth/register</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/auth/login</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`,
    );
  }
}
