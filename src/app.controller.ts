import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Render,
  Sse,
} from '@nestjs/common';
import { Subject } from 'rxjs';
import { AppService } from './app.service';

@Controller()
export class AppController {
  private logger = new Logger(AppController.name);

  private message$ = new Subject<string>();

  constructor(private readonly appService: AppService) {}

  @Get()
  @Render('index')
  getHello(): any {
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

  @Get('.well-known/*path')
  well_known() {
    return {}; // Just return empty object
  }
}
