import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { AppConfig } from '../config/configuration';
import { JOB_TYPE_DIAGNOSTICS } from './jobs.constants';
import { JobsService } from './jobs.service';

@Injectable()
export class JobsWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobsWorkerService.name);
  private running = false;
  private tickInFlight = false;
  private ready = false;

  constructor(
    private readonly jobs: JobsService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  onModuleInit(): void {
    this.jobs.registerHandler(JOB_TYPE_DIAGNOSTICS, async () => {
      // Harmless Milestone 1 diagnostic: no HTTP probes, no side effects.
    });
    this.running = true;
    this.ready = true;
    this.logger.log(`Jobs worker ready (id=${this.jobs.getWorkerId()})`);
  }

  async onModuleDestroy(): Promise<void> {
    this.ready = false;
    this.jobs.beginShutdown();
    this.running = false;
    const deadline = Date.now() + 5_000;
    while (this.tickInFlight && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    this.logger.log('Jobs worker stopped');
  }

  isReady(): boolean {
    return this.ready && this.running && !this.jobs.isShuttingDown();
  }

  /**
   * Poll interval is configured via JOB_POLL_INTERVAL_MS for documentation;
   * Nest Interval decorator requires a compile-time number, so we use 1000ms
   * and skip work when a previous tick is still running.
   */
  @Interval(1000)
  async poll(): Promise<void> {
    if (!this.running || this.tickInFlight || this.jobs.isShuttingDown()) {
      return;
    }

    this.tickInFlight = true;
    try {
      const job = await this.jobs.claimNextJob();
      if (job) {
        await this.jobs.processClaimedJob(job);
      }

      // Opportunistic cleanup; bounded by retention window.
      if (Math.random() < 0.05) {
        await this.jobs.cleanupDiagnosticJobs();
      }
    } catch (error) {
      this.logger.warn(
        `Jobs poll error: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      this.tickInFlight = false;
    }
  }

  /** Exposed for tests to drive a single poll without waiting on the interval. */
  async runOnceForTests(): Promise<void> {
    await this.poll();
  }

  getConfiguredPollIntervalMs(): number {
    return this.config.get('jobPollIntervalMs', { infer: true });
  }
}
