export type HealthStatus = 'ok' | 'degraded' | 'error';

export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  path?: string;
  timestamp: string;
}

export interface AppMetadata {
  name: string;
  version: string;
  environment: string;
  docs: string;
}

export interface LivenessResponse {
  status: 'ok';
  timestamp: string;
}

export interface DependencyCheck {
  name: string;
  status: HealthStatus;
  latencyMs?: number;
  message?: string;
}

export interface ReadinessResponse {
  status: HealthStatus;
  timestamp: string;
  checks: DependencyCheck[];
}

export interface QueueDiagnosticsResponse {
  status: HealthStatus;
  queue: string;
  backend: 'mysql-jobs';
  jobs: DependencyCheck;
  timestamp: string;
}

export function isHealthyStatus(status: HealthStatus): boolean {
  return status === 'ok';
}
