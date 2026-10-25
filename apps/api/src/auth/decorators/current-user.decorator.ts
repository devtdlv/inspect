import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthRequestUser } from '../auth.types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthRequestUser => {
    const request = ctx.switchToHttp().getRequest<Request & { user?: AuthRequestUser }>();
    if (!request.user) {
      throw new Error('CurrentUser used without SessionGuard');
    }
    return request.user;
  },
);
