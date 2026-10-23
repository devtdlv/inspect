import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

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
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
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

  return validated;
}

export function configuration(): AppConfig {
  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
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
  };
}
