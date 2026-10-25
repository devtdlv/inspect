import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { AppConfig } from '../../config/configuration';

/**
 * When an Origin header is present, it must match the configured CORS origin.
 * Browsers send Origin on cross-origin credentialed POSTs; missing Origin is
 * allowed for non-browser clients (CLI, tests). SameSite cookies remain the
 * primary CSRF control for unauthenticated login/register.
 */
@Injectable()
export class OriginGuard implements CanActivate {
  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const origin = request.headers.origin;
    if (!origin) {
      return true;
    }

    const allowed = this.config.get('api.corsOrigin', { infer: true });
    if (origin !== allowed) {
      throw new ForbiddenException('Origin not allowed');
    }

    return true;
  }
}
