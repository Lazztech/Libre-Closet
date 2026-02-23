import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request, Response, NextFunction } from 'express';
import { I18nContext } from 'nestjs-i18n';
import { User } from '../dal/entity/user.entity';

@Injectable()
export class ViewContextMiddleware implements NestMiddleware {
  private logger = new Logger(ViewContextMiddleware.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    res.locals.appName = this.configService.get<string>('APP_NAME');
    res.locals.siteUrl = req.get('host');
    res.locals.baseUrl = req.baseUrl;
    res.locals.authEnabled = this.configService.get<boolean>('AUTH_ENABLED');
    res.locals.pwaEnabled = this.configService.get<boolean>('PWA_ENABLED');
    // Assign locale for i18n language selection
    res.locals.locale = I18nContext.current()?.lang;
    try {
      const token = req.cookies?.['access_token'] as string;
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('ACCESS_TOKEN_SECRET'),
      });
      // Assign user to gloabal view state
      const user = await this.userRepository.findOne({
        id: payload.userId,
      });
      res.locals.user = user;
    } catch {
      this.logger.debug('User payload not available');
    }
    next();
  }
}
