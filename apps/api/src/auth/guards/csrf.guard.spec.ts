import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '../auth.constants';
import { CsrfGuard } from './csrf.guard';

function makeContext(cookie?: string, header?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        cookies: cookie ? { [CSRF_COOKIE_NAME]: cookie } : {},
        headers: header ? { [CSRF_HEADER_NAME]: header } : {},
      }),
    }),
  } as ExecutionContext;
}

describe('CsrfGuard', () => {
  const guard = new CsrfGuard();

  it('allows matching double-submit tokens', () => {
    expect(guard.canActivate(makeContext('token-abc', 'token-abc'))).toBe(true);
  });

  it('rejects mismatched tokens', () => {
    expect(() => guard.canActivate(makeContext('token-abc', 'other'))).toThrow(ForbiddenException);
  });

  it('rejects missing cookie or header', () => {
    expect(() => guard.canActivate(makeContext(undefined, 'token'))).toThrow(ForbiddenException);
    expect(() => guard.canActivate(makeContext('token', undefined))).toThrow(ForbiddenException);
  });
});
