import 'reflect-metadata';
import { validateEnv } from './configuration';

describe('validateEnv auth hardening', () => {
  const base = {
    DATABASE_URL: 'mysql://inspect_app:test@127.0.0.1:3306/inspect',
  };

  it('accepts default development auth settings', () => {
    expect(() =>
      validateEnv({
        ...base,
        NODE_ENV: 'development',
      }),
    ).not.toThrow();
  });

  it('rejects AUTH_SENSITIVE_RATE_LIMIT above the absolute max', () => {
    expect(() =>
      validateEnv({
        ...base,
        NODE_ENV: 'development',
        AUTH_SENSITIVE_RATE_LIMIT: 101,
      }),
    ).toThrow(/Configuration validation failed/);
  });

  it('rejects AUTH_SENSITIVE_RATE_LIMIT above the production ceiling', () => {
    expect(() =>
      validateEnv({
        ...base,
        NODE_ENV: 'production',
        AUTH_SENSITIVE_RATE_LIMIT: 31,
        COOKIE_SECURE: true,
      }),
    ).toThrow(/AUTH_SENSITIVE_RATE_LIMIT must be <= 30 in production/);
  });

  it('rejects COOKIE_SECURE=false in production', () => {
    expect(() =>
      validateEnv({
        ...base,
        NODE_ENV: 'production',
        COOKIE_SECURE: false,
      }),
    ).toThrow(/COOKIE_SECURE=false is not allowed/);
  });

  it('rejects AUTH_REQUIRE_ORIGIN=false in production', () => {
    expect(() =>
      validateEnv({
        ...base,
        NODE_ENV: 'production',
        COOKIE_SECURE: true,
        AUTH_REQUIRE_ORIGIN: false,
      }),
    ).toThrow(/AUTH_REQUIRE_ORIGIN=false is not allowed/);
  });

  it('rejects SameSite=none without Secure', () => {
    expect(() =>
      validateEnv({
        ...base,
        NODE_ENV: 'development',
        COOKIE_SAME_SITE: 'none',
        COOKIE_SECURE: false,
      }),
    ).toThrow(/COOKIE_SAME_SITE=none requires COOKIE_SECURE=true/);
  });

  it('allows elevated rate limits in test for e2e suites', () => {
    expect(() =>
      validateEnv({
        ...base,
        NODE_ENV: 'test',
        AUTH_SENSITIVE_RATE_LIMIT: 100,
      }),
    ).not.toThrow();
  });
});
