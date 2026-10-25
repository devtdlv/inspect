import type { CookieOptions, Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/configuration';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME, SESSION_COOKIE_NAME } from './auth.constants';

export function getCookieOptions(
  config: ConfigService<AppConfig, true>,
  maxAgeMs: number,
  httpOnly: boolean,
): CookieOptions {
  return {
    httpOnly,
    secure: config.get('auth.cookieSecure', { infer: true }),
    sameSite: config.get('auth.cookieSameSite', { infer: true }),
    path: '/',
    maxAge: maxAgeMs,
  };
}

export function setSessionCookies(
  res: Response,
  config: ConfigService<AppConfig, true>,
  rawSessionToken: string,
  csrfToken: string,
  ttlSeconds: number,
): void {
  const maxAgeMs = ttlSeconds * 1000;
  res.cookie(SESSION_COOKIE_NAME, rawSessionToken, getCookieOptions(config, maxAgeMs, true));
  res.cookie(CSRF_COOKIE_NAME, csrfToken, getCookieOptions(config, maxAgeMs, false));
}

export function clearAuthCookies(res: Response, config: ConfigService<AppConfig, true>): void {
  const base = getCookieOptions(config, 0, true);
  res.clearCookie(SESSION_COOKIE_NAME, {
    path: base.path,
    secure: base.secure,
    sameSite: base.sameSite,
  });
  res.clearCookie(CSRF_COOKIE_NAME, {
    path: base.path,
    secure: base.secure,
    sameSite: base.sameSite,
  });
}

export function readSessionToken(req: Request): string | undefined {
  const cookies = req.cookies as Record<string, string> | undefined;
  const value = cookies?.[SESSION_COOKIE_NAME];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function readCsrfCookie(req: Request): string | undefined {
  const cookies = req.cookies as Record<string, string> | undefined;
  const value = cookies?.[CSRF_COOKIE_NAME];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function readCsrfHeader(req: Request): string | undefined {
  const header = req.headers[CSRF_HEADER_NAME];
  if (typeof header === 'string' && header.length > 0) {
    return header;
  }
  return undefined;
}
