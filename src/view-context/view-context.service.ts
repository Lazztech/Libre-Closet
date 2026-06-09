import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { FastifyRequest } from 'fastify';
import { I18nContext } from 'nestjs-i18n';
import { User } from '../dal/entity/user.entity';

@Injectable()
export class ViewContextService {
  private logger = new Logger(ViewContextService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {}

  async buildContext(req: FastifyRequest) {
    const locale = I18nContext.current()?.lang ?? 'en';
    const path = req.url.split('?')[0];
    const canonicalUrl = `${req.protocol}://${req.hostname}${path}`;
    const ogLocaleMap: Record<string, string> = {
      en: 'en_US',
      ru: 'ru_RU',
      es: 'es_ES',
      fr: 'fr_FR',
      it: 'it_IT',
      de: 'de_DE',
    };

    const context: Record<string, any> = {
      appName: this.configService.get<string>('APP_NAME'),
      siteUrl: req.host,
      baseUrl: req.url === '/' ? '' : req.url,
      authEnabled: this.configService.get<boolean>('AUTH_ENABLED'),
      signupsDisabled:
        this.configService.get<string>('DISABLE_REGISTRATION') === 'true',
      pwaEnabled: this.configService.get<boolean>('PWA_ENABLED'),
      locale,
      canonicalUrl,
      ogUrl: canonicalUrl,
      ogLocale: ogLocaleMap[locale] ?? 'en_US',
    };

    try {
      const token = (req.cookies as Record<string, string>)?.['access_token'];
      if (token) {
        const payload = await this.jwtService.verifyAsync(token, {
          secret: this.configService.get<string>('ACCESS_TOKEN_SECRET'),
        });
        const user = await this.userRepository.findOne({ id: payload.userId });
        context.user = user;
      }
    } catch {
      this.logger.debug('User payload not available');
    }

    return context;
  }
}
