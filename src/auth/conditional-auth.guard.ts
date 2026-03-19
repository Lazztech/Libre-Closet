import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CanActivate, ExecutionContext } from '@nestjs/common';
import { AuthService } from './auth.service';

/**
 * When AUTH_ENABLED=false: passes all requests through (no auth needed).
 * When AUTH_ENABLED=true: parses the JWT cookie and populates request.user.
 *   - Authenticated: passes through.
 *   - Unauthenticated: redirects to /auth/login instead of returning 401/403.
 */
@Injectable()
export class ConditionalAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.configService.get<boolean>('AUTH_ENABLED')) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = request.cookies?.['access_token'] as string;

    if (token) {
      try {
        const payload = await this.jwtService.verifyAsync(token, {
          secret: this.configService.get<string>('ACCESS_TOKEN_SECRET'),
        });
        await this.authService.verifyPwf(payload);
        request['user'] = payload;
        return true;
      } catch {
        // invalid/expired token or fingerprint mismatch — fall through to redirect
      }
    }

    const response = context.switchToHttp().getResponse();
    response.redirect('/auth/login');
    return false;
  }
}
