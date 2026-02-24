import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CanActivate, ExecutionContext } from '@nestjs/common';

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
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.configService.get<boolean>('AUTH_ENABLED')) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = request.cookies?.['access_token'] as string;

    if (token) {
      try {
        request['user'] = await this.jwtService.verifyAsync(token, {
          secret: this.configService.get<string>('ACCESS_TOKEN_SECRET'),
        });
        return true;
      } catch {
        // invalid/expired token — fall through to redirect
      }
    }

    const response = context.switchToHttp().getResponse();
    response.redirect('/auth/login');
    return false;
  }
}
