import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * When DISABLE_REGISTRATION=false: allows user sign ups.
 * When DISABLE_REGISTRATION=true: user sign ups are disabled.
 *   - Redirects to /auth/login.
 */
@Injectable()
export class DisableRegistrationGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    if (this.configService.get<string>('DISABLE_REGISTRATION') === 'true') {
      const response = context.switchToHttp().getResponse();
      response.redirect('/auth/login', 302);
      return false;
    }
    return true;
  }
}
