import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { readSessionToken } from '../cookies';
import type { AuthRequestUser } from '../auth.types';
import { SessionService } from '../session.service';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly sessions: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthRequestUser }>();
    const rawToken = readSessionToken(request);
    if (!rawToken) {
      throw new UnauthorizedException('Authentication required');
    }

    const session = await this.sessions.findValidSessionByRawToken(rawToken);
    if (!session) {
      throw new UnauthorizedException('Authentication required');
    }

    request.user = {
      id: session.user.id,
      email: session.user.email,
      createdAt: session.user.createdAt,
      sessionId: session.id,
    };

    return true;
  }
}
