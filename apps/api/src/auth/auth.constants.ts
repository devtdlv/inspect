export const SESSION_COOKIE_NAME = 'inspect.sid';
export const CSRF_COOKIE_NAME = 'inspect.csrf';
export const CSRF_HEADER_NAME = 'x-csrf-token';

export const AUTH_PASSWORD_MIN_LENGTH = 8;
export const AUTH_PASSWORD_MAX_LENGTH = 128;
export const AUTH_EMAIL_MAX_LENGTH = 320;

/** Default session lifetime: 14 days. */
export const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

/**
 * Login/register rate limit (per IP, rolling window).
 * Defaults: 10 / 60s. Overridable via AUTH_SENSITIVE_RATE_LIMIT and
 * AUTH_SENSITIVE_RATE_TTL_MS (used by automated tests; keep production defaults).
 */
export const AUTH_SENSITIVE_THROTTLE = {
  default: {
    limit: () => Number(process.env.AUTH_SENSITIVE_RATE_LIMIT ?? 10),
    ttl: () => Number(process.env.AUTH_SENSITIVE_RATE_TTL_MS ?? 60_000),
  },
};
