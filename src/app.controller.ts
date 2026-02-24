import { Controller, Get, Render } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  @Render('index')
  index() {
    return {};
  }

  @Get('offline.html')
  @Render('offline')
  getOffline() {}

  @Get('.well-known/*path')
  well_known() {
    return {};
  }
}
