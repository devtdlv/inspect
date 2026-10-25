import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { AppConfig } from '../../config/configuration';

/**
 * Browser Origin enforcement for cookie-mutating auth routes.
 *
 * Production / SameSite=None: Origin is required and must equal API_CORS_ORIGIN.
 * Development / test: missing Origin is allowed for CLI and automated tests;
 * a present Origin must still match API_CORS_ORIGIN.
 *
 * Login/register do not use double-submit CSRF (no prior cookie). Origin +
 * SameSite remain the browser CSRF controls for those endpoints. Logout also
 * requires CSRF (see CsrfGuard).
 */
@Injectable()
export class OriginGuard implements CanActivate {
  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const origin = request.headers.origin;
    const allowed = this.config.get('api.corsOrigin', { infer: true });
    const requireOrigin = this.config.get('auth.requireOrigin', { infer: true });

    if (!origin) {
      if (requireOrigin) {
        throw new ForbiddenException('Origin required');
      }
      return true;
    }

    if (origin !== allowed) {
      throw new ForbiddenException('Origin not allowed');
    }

    return true;
  }
}
