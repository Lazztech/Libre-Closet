import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { I18nContext } from 'nestjs-i18n';
import { AppService } from './app.service';
import { ConfigService } from '@nestjs/config';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, ConfigService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('index', () => {
    it('should return a context object with translated pageTitle', () => {
      const i18n = { t: (key: string) => key } as unknown as I18nContext;
      expect(appController.index(i18n)).toEqual({
        pageTitle: 'lang.PAGE_TITLE_HOME',
      });
    });
  });
});
