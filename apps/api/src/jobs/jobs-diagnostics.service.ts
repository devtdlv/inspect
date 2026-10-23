import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobStatus } from '@prisma/client';
import type { QueueDiagnosticsResponse } from '@inspect/shared';
import { AppConfig } from '../config/configuration';
import { withTimeout } from '../common/utils/with-timeout';
import { JobsService } from './jobs.service';
import { JobsWorkerService } from './jobs-worker.service';

@Injectable()
export class JobsDiagnosticsService {
  constructor(
    private readonly jobs: JobsService,
    private readonly worker: JobsWorkerService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async getDiagnostics(): Promise<QueueDiagnosticsResponse> {
    const timeoutMs = Math.max(this.config.get('healthCheckTimeoutMs', { infer: true }), 5_000);
    const started = Date.now();

    try {
      if (!this.worker.isReady()) {
        throw new Error('jobs worker is not ready');
      }

      await withTimeout(this.jobs.pingJobsTable(), timeoutMs, 'jobs-table');

      const job = await withTimeout(this.jobs.enqueueDiagnostics(), timeoutMs, 'jobs-enqueue');

      const completed = await this.waitForTerminalState(job.id, timeoutMs);
      if (!completed) {
        throw new Error('diagnostic job did not complete in time');
      }

      await this.jobs.cleanupDiagnosticJobs();

      return {
        status: 'ok',
        queue: 'background_jobs',
        backend: 'mysql-jobs',
        jobs: {
          name: 'mysql-jobs',
          status: 'ok',
          latencyMs: Date.now() - started,
          message: 'diagnostic job completed',
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        queue: 'background_jobs',
        backend: 'mysql-jobs',
        jobs: {
          name: 'mysql-jobs',
          status: 'error',
          latencyMs: Date.now() - started,
          message: error instanceof Error ? error.message : 'Unknown jobs error',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  private async waitForTerminalState(jobId: string, timeoutMs: number): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      // Drive the worker so diagnostics do not depend solely on the interval timer.
      await this.worker.runOnceForTests();
      const job = await this.jobs.getJob(jobId);
      if (!job) {
        return true;
      }
      if (job.status === JobStatus.completed) {
        return true;
      }
      if (job.status === JobStatus.failed) {
        throw new Error(job.lastError ?? 'diagnostic job failed');
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    return false;
  }
}
