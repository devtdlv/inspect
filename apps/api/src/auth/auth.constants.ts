export const SESSION_COOKIE_NAME = 'inspect.sid';
export const CSRF_COOKIE_NAME = 'inspect.csrf';
export const CSRF_HEADER_NAME = 'x-csrf-token';

export const AUTH_PASSWORD_MIN_LENGTH = 8;
export const AUTH_PASSWORD_MAX_LENGTH = 128;
export const AUTH_EMAIL_MAX_LENGTH = 320;

/** Default session lifetime: 14 days. */
export const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

export const DEFAULT_AUTH_SENSITIVE_RATE_LIMIT = 10;
export const MIN_AUTH_SENSITIVE_RATE_LIMIT = 1;
export const MAX_AUTH_SENSITIVE_RATE_LIMIT = 100;
/** Stricter ceiling when NODE_ENV=production. */
export const MAX_AUTH_SENSITIVE_RATE_LIMIT_PRODUCTION = 30;

export const DEFAULT_AUTH_SENSITIVE_RATE_TTL_MS = 60_000;
export const MIN_AUTH_SENSITIVE_RATE_TTL_MS = 1_000;
export const MAX_AUTH_SENSITIVE_RATE_TTL_MS = 600_000;

/**
 * Login/register rate limit (per direct-connection IP, rolling window).
 * Values come from validated env (see configuration.ts). In-memory Nest
 * throttling is per-process and unsuitable alone for multi-instance production.
 */
export const AUTH_SENSITIVE_THROTTLE = {
  default: {
    limit: () => Number(process.env.AUTH_SENSITIVE_RATE_LIMIT ?? DEFAULT_AUTH_SENSITIVE_RATE_LIMIT),
    ttl: () => Number(process.env.AUTH_SENSITIVE_RATE_TTL_MS ?? DEFAULT_AUTH_SENSITIVE_RATE_TTL_MS),
  },
};
