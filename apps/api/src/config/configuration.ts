import { plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';
import {
  DEFAULT_AUTH_SENSITIVE_RATE_LIMIT,
  DEFAULT_AUTH_SENSITIVE_RATE_TTL_MS,
  DEFAULT_SESSION_TTL_SECONDS,
  MAX_AUTH_SENSITIVE_RATE_LIMIT,
  MAX_AUTH_SENSITIVE_RATE_LIMIT_PRODUCTION,
  MAX_AUTH_SENSITIVE_RATE_TTL_MS,
  MIN_AUTH_SENSITIVE_RATE_LIMIT,
  MIN_AUTH_SENSITIVE_RATE_TTL_MS,
} from '../auth/auth.constants';

export class EnvironmentVariables {
  @IsOptional()
  @IsIn(['development', 'test', 'production'])
  NODE_ENV?: string = 'development';

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  APP_NAME?: string = 'Inspect';

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  APP_VERSION?: string = '0.0.1';

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  API_HOST?: string = '0.0.0.0';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  API_PORT?: number = 3001;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  API_CORS_ORIGIN?: string = 'http://localhost:5173';

  @IsOptional()
  @IsIn(['fatal', 'error', 'warn', 'log', 'info', 'debug', 'verbose'])
  LOG_LEVEL?: string = 'log';

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsOptional()
  @IsInt()
  @Min(200)
  @Max(60_000)
  JOB_POLL_INTERVAL_MS?: number = 1000;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(3600)
  JOB_LEASE_SECONDS?: number = 30;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168)
  JOB_DIAGNOSTIC_RETENTION_HOURS?: number = 24;

  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(30000)
  HEALTH_CHECK_TIMEOUT_MS?: number = 2000;

  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(60 * 60 * 24 * 90)
  SESSION_TTL_SECONDS?: number = DEFAULT_SESSION_TTL_SECONDS;

  @IsOptional()
  @IsBoolean()
  COOKIE_SECURE?: boolean;

  @IsOptional()
  @IsIn(['lax', 'strict', 'none'])
  COOKIE_SAME_SITE?: 'lax' | 'strict' | 'none' = 'lax';

  @IsOptional()
  @IsBoolean()
  AUTH_REQUIRE_ORIGIN?: boolean;

  @IsOptional()
  @IsInt()
  @Min(MIN_AUTH_SENSITIVE_RATE_LIMIT)
  @Max(MAX_AUTH_SENSITIVE_RATE_LIMIT)
  AUTH_SENSITIVE_RATE_LIMIT?: number = DEFAULT_AUTH_SENSITIVE_RATE_LIMIT;

  @IsOptional()
  @IsInt()
  @Min(MIN_AUTH_SENSITIVE_RATE_TTL_MS)
  @Max(MAX_AUTH_SENSITIVE_RATE_TTL_MS)
  AUTH_SENSITIVE_RATE_TTL_MS?: number = DEFAULT_AUTH_SENSITIVE_RATE_TTL_MS;
}

export interface AppConfig {
  nodeEnv: string;
  app: {
    name: string;
    version: string;
  };
  api: {
    host: string;
    port: number;
    corsOrigin: string;
  };
  logLevel: string;
  databaseUrl: string;
  jobPollIntervalMs: number;
  jobLeaseSeconds: number;
  jobDiagnosticRetentionHours: number;
  healthCheckTimeoutMs: number;
  auth: {
    sessionTtlSeconds: number;
    cookieSecure: boolean;
    cookieSameSite: 'lax' | 'strict' | 'none';
    requireOrigin: boolean;
    sensitiveRateLimit: number;
    sensitiveRateTtlMs: number;
  };
}

function parseOptionalBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  return undefined;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const withBooleans = {
    ...config,
    COOKIE_SECURE:
      config.COOKIE_SECURE !== undefined
        ? parseOptionalBoolean(String(config.COOKIE_SECURE))
        : undefined,
    AUTH_REQUIRE_ORIGIN:
      config.AUTH_REQUIRE_ORIGIN !== undefined
        ? parseOptionalBoolean(String(config.AUTH_REQUIRE_ORIGIN))
        : undefined,
  };

  const validated = plainToInstance(EnvironmentVariables, withBooleans, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
    whitelist: true,
  });

  if (errors.length > 0) {
    const messages = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('; ');
    throw new Error(`Configuration validation failed: ${messages}`);
  }

  const nodeEnv = validated.NODE_ENV ?? 'development';
  const effectiveSecure = validated.COOKIE_SECURE ?? nodeEnv === 'production';
  if (validated.COOKIE_SAME_SITE === 'none' && !effectiveSecure) {
    throw new Error(
      'Configuration validation failed: COOKIE_SAME_SITE=none requires COOKIE_SECURE=true',
    );
  }

  if (nodeEnv === 'production' && validated.COOKIE_SECURE === false) {
    throw new Error(
      'Configuration validation failed: COOKIE_SECURE=false is not allowed when NODE_ENV=production',
    );
  }

  const rateLimit = validated.AUTH_SENSITIVE_RATE_LIMIT ?? DEFAULT_AUTH_SENSITIVE_RATE_LIMIT;
  if (nodeEnv === 'production' && rateLimit > MAX_AUTH_SENSITIVE_RATE_LIMIT_PRODUCTION) {
    throw new Error(
      `Configuration validation failed: AUTH_SENSITIVE_RATE_LIMIT must be <= ${MAX_AUTH_SENSITIVE_RATE_LIMIT_PRODUCTION} in production`,
    );
  }

  if (validated.AUTH_REQUIRE_ORIGIN === false && nodeEnv === 'production') {
    throw new Error(
      'Configuration validation failed: AUTH_REQUIRE_ORIGIN=false is not allowed when NODE_ENV=production',
    );
  }

  return validated;
}

export function configuration(): AppConfig {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const cookieSecureEnv = parseOptionalBoolean(process.env.COOKIE_SECURE);
  const cookieSameSite =
    (process.env.COOKIE_SAME_SITE as 'lax' | 'strict' | 'none' | undefined) ?? 'lax';

  const cookieSecure = cookieSecureEnv ?? nodeEnv === 'production';

  const requireOriginEnv = parseOptionalBoolean(process.env.AUTH_REQUIRE_ORIGIN);
  // Production and SameSite=None always require Origin. Dev/test may omit for CLI/tests.
  const requireOrigin = requireOriginEnv ?? (nodeEnv === 'production' || cookieSameSite === 'none');

  const sensitiveRateLimit = Number(
    process.env.AUTH_SENSITIVE_RATE_LIMIT ?? DEFAULT_AUTH_SENSITIVE_RATE_LIMIT,
  );
  const sensitiveRateTtlMs = Number(
    process.env.AUTH_SENSITIVE_RATE_TTL_MS ?? DEFAULT_AUTH_SENSITIVE_RATE_TTL_MS,
  );

  return {
    nodeEnv,
    app: {
      name: process.env.APP_NAME ?? 'Inspect',
      version: process.env.APP_VERSION ?? '0.0.1',
    },
    api: {
      host: process.env.API_HOST ?? '0.0.0.0',
      port: Number(process.env.API_PORT ?? 3001),
      corsOrigin: process.env.API_CORS_ORIGIN ?? 'http://localhost:5173',
    },
    logLevel: process.env.LOG_LEVEL ?? 'log',
    databaseUrl: process.env.DATABASE_URL ?? '',
    jobPollIntervalMs: Number(process.env.JOB_POLL_INTERVAL_MS ?? 1000),
    jobLeaseSeconds: Number(process.env.JOB_LEASE_SECONDS ?? 30),
    jobDiagnosticRetentionHours: Number(process.env.JOB_DIAGNOSTIC_RETENTION_HOURS ?? 24),
    healthCheckTimeoutMs: Number(process.env.HEALTH_CHECK_TIMEOUT_MS ?? 2000),
    auth: {
      sessionTtlSeconds: Number(process.env.SESSION_TTL_SECONDS ?? DEFAULT_SESSION_TTL_SECONDS),
      cookieSecure,
      cookieSameSite,
      requireOrigin,
      sensitiveRateLimit,
      sensitiveRateTtlMs,
    },
  };
}
