import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CanActivate, ExecutionContext } from '@nestjs/common';

/**
 * A non-blocking guard that populates request.user when AUTH_ENABLED=true
 * and a valid JWT cookie is present. Always returns true so routes are
 * accessible regardless of auth configuration.
 */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
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
    if (!token) return true;
    try {
      request['user'] = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('ACCESS_TOKEN_SECRET'),
      });
    } catch {
      // invalid token — leave request.user unset, still allow the request
    }
    return true;
  }
}
