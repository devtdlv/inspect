import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OriginGuard } from './origin.guard';

function makeContext(origin?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: origin ? { origin } : {},
      }),
    }),
  } as ExecutionContext;
}

describe('OriginGuard', () => {
  const config = {
    get: jest.fn(),
  } as unknown as ConfigService;

  const guard = new OriginGuard(
    config as unknown as ConfigService<import('../../config/configuration').AppConfig, true>,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    (config.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'api.corsOrigin') return 'http://localhost:5173';
      if (key === 'auth.requireOrigin') return false;
      return undefined;
    });
  });

  it('allows missing Origin when requireOrigin is false', () => {
    expect(guard.canActivate(makeContext())).toBe(true);
  });

  it('rejects missing Origin when requireOrigin is true', () => {
    (config.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'api.corsOrigin') return 'http://localhost:5173';
      if (key === 'auth.requireOrigin') return true;
      return undefined;
    });

    expect(() => guard.canActivate(makeContext())).toThrow(ForbiddenException);
    expect(() => guard.canActivate(makeContext())).toThrow('Origin required');
  });

  it('allows a matching Origin', () => {
    expect(guard.canActivate(makeContext('http://localhost:5173'))).toBe(true);
  });

  it('rejects an invalid Origin', () => {
    expect(() => guard.canActivate(makeContext('https://evil.example'))).toThrow(
      ForbiddenException,
    );
  });
});
