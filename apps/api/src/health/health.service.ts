import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  DependencyCheck,
  HealthStatus,
  LivenessResponse,
  ReadinessResponse,
} from '@inspect/shared';
import { AppConfig } from '../config/configuration';
import { withTimeout } from '../common/utils/with-timeout';
import { JobsService } from '../jobs/jobs.service';
import { JobsWorkerService } from '../jobs/jobs-worker.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly jobs: JobsService,
    private readonly worker: JobsWorkerService,
  ) {}

  getLiveness(): LivenessResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness(): Promise<ReadinessResponse> {
    const timeoutMs = this.config.get('healthCheckTimeoutMs', { infer: true });
    const checks = await Promise.all([this.checkDatabase(timeoutMs), this.checkJobs(timeoutMs)]);

    return {
      status: this.aggregateStatus(checks),
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  private aggregateStatus(checks: DependencyCheck[]): HealthStatus {
    if (checks.every((check) => check.status === 'ok')) {
      return 'ok';
    }
    if (checks.some((check) => check.status === 'error')) {
      return 'error';
    }
    return 'degraded';
  }

  private async checkDatabase(timeoutMs: number): Promise<DependencyCheck> {
    const started = Date.now();
    try {
      await withTimeout(this.prisma.ping(), timeoutMs, 'database');
      return {
        name: 'mysql',
        status: 'ok',
        latencyMs: Date.now() - started,
      };
    } catch (error) {
      return {
        name: 'mysql',
        status: 'error',
        latencyMs: Date.now() - started,
        message: error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  }

  private async checkJobs(timeoutMs: number): Promise<DependencyCheck> {
    const started = Date.now();
    try {
      await withTimeout(
        (async () => {
          if (!this.worker.isReady()) {
            throw new Error('jobs worker is not ready');
          }
          await this.jobs.pingJobsTable();
        })(),
        timeoutMs,
        'jobs',
      );

      return {
        name: 'mysql-jobs',
        status: 'ok',
        latencyMs: Date.now() - started,
      };
    } catch (error) {
      return {
        name: 'mysql-jobs',
        status: 'error',
        latencyMs: Date.now() - started,
        message: error instanceof Error ? error.message : 'Unknown jobs error',
      };
    }
  }
}
