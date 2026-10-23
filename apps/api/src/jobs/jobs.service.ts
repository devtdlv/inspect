import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BackgroundJob, JobStatus, Prisma } from '@prisma/client';
import { hostname } from 'node:os';
import { AppConfig } from '../config/configuration';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_MAX_ATTEMPTS,
  JOB_TYPE_DIAGNOSTICS,
  RETRY_BASE_DELAY_SECONDS,
  RETRY_MAX_DELAY_SECONDS,
} from './jobs.constants';

export type JobHandler = (job: BackgroundJob) => Promise<void>;

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private readonly workerId = `${hostname()}-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
  private readonly handlers = new Map<string, JobHandler>();
  private shuttingDown = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  getWorkerId(): string {
    return this.workerId;
  }

  isShuttingDown(): boolean {
    return this.shuttingDown;
  }

  beginShutdown(): void {
    this.shuttingDown = true;
  }

  registerHandler(type: string, handler: JobHandler): void {
    this.handlers.set(type, handler);
  }

  async enqueue(
    type: string,
    payload: Prisma.InputJsonValue,
    options?: { maxAttempts?: number; runAt?: Date },
  ): Promise<BackgroundJob> {
    return this.prisma.backgroundJob.create({
      data: {
        type,
        payload,
        maxAttempts: options?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
        runAt: options?.runAt ?? new Date(),
        status: JobStatus.pending,
      },
    });
  }

  async enqueueDiagnostics(): Promise<BackgroundJob> {
    return this.enqueue(JOB_TYPE_DIAGNOSTICS, {
      purpose: 'milestone-1-diagnostics',
      at: new Date().toISOString(),
    });
  }

  /**
   * Atomically claim the next available job using MySQL row locking.
   * Concurrent workers cannot claim the same row (FOR UPDATE SKIP LOCKED).
   */
  async claimNextJob(): Promise<BackgroundJob | null> {
    if (this.shuttingDown) {
      return null;
    }

    const leaseSeconds = this.config.get('jobLeaseSeconds', { infer: true });
    const lockedBy = this.workerId;

    return this.prisma.$transaction(
      async (tx) => {
        const rows = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id
          FROM background_jobs
          WHERE (
            status = 'pending' AND run_at <= UTC_TIMESTAMP(3)
          ) OR (
            status = 'processing'
            AND locked_until IS NOT NULL
            AND locked_until < UTC_TIMESTAMP(3)
          )
          ORDER BY run_at ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        `;

        const id = rows[0]?.id;
        if (!id) {
          return null;
        }

        const lockedUntil = new Date(Date.now() + leaseSeconds * 1000);

        return tx.backgroundJob.update({
          where: { id },
          data: {
            status: JobStatus.processing,
            lockedBy,
            lockedUntil,
            attempts: { increment: 1 },
            lastError: null,
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        timeout: 10_000,
      },
    );
  }

  async completeJob(jobId: string): Promise<void> {
    await this.prisma.backgroundJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.completed,
        lockedBy: null,
        lockedUntil: null,
        completedAt: new Date(),
        lastError: null,
      },
    });
  }

  async failJob(job: BackgroundJob, error: unknown): Promise<void> {
    const message = error instanceof Error ? error.message : String(error);
    const attempts = job.attempts;
    const canRetry = attempts < job.maxAttempts;

    if (canRetry) {
      const delaySeconds = Math.min(RETRY_MAX_DELAY_SECONDS, RETRY_BASE_DELAY_SECONDS * attempts);
      await this.prisma.backgroundJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.pending,
          lockedBy: null,
          lockedUntil: null,
          lastError: message.slice(0, 4000),
          runAt: new Date(Date.now() + delaySeconds * 1000),
        },
      });
      this.logger.warn(
        `Job ${job.id} (${job.type}) will retry in ${delaySeconds}s (attempt ${attempts}/${job.maxAttempts})`,
      );
      return;
    }

    await this.prisma.backgroundJob.update({
      where: { id: job.id },
      data: {
        status: JobStatus.failed,
        lockedBy: null,
        lockedUntil: null,
        lastError: message.slice(0, 4000),
        completedAt: new Date(),
      },
    });
    this.logger.error(`Job ${job.id} (${job.type}) failed permanently: ${message}`);
  }

  async processClaimedJob(job: BackgroundJob): Promise<void> {
    const handler = this.handlers.get(job.type);
    if (!handler) {
      await this.failJob(job, new Error(`No handler registered for job type: ${job.type}`));
      return;
    }

    try {
      // Do not log job payloads (may contain sensitive data in later milestones).
      this.logger.debug(`Executing job ${job.id} type=${job.type}`);
      await handler(job);
      await this.completeJob(job.id);
    } catch (error) {
      await this.failJob(job, error);
    }
  }

  async getJob(id: string): Promise<BackgroundJob | null> {
    return this.prisma.backgroundJob.findUnique({ where: { id } });
  }

  async cleanupDiagnosticJobs(): Promise<number> {
    const hours = this.config.get('jobDiagnosticRetentionHours', { infer: true });
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const result = await this.prisma.backgroundJob.deleteMany({
      where: {
        type: JOB_TYPE_DIAGNOSTICS,
        status: { in: [JobStatus.completed, JobStatus.failed] },
        completedAt: { lt: cutoff },
      },
    });
    return result.count;
  }

  async pingJobsTable(): Promise<void> {
    await this.prisma.$queryRaw`SELECT 1 FROM background_jobs LIMIT 1`;
  }
}
