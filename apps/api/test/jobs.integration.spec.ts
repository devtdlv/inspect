import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { JobStatus, PrismaClient } from '@prisma/client';
import { configuration, validateEnv } from '../src/config/configuration';
import { JobsModule } from '../src/jobs/jobs.module';
import { JobsService } from '../src/jobs/jobs.service';
import { JobsWorkerService } from '../src/jobs/jobs-worker.service';
import { JobsDiagnosticsService } from '../src/jobs/jobs-diagnostics.service';
import { PrismaModule } from '../src/prisma/prisma.module';

const databaseUrl = process.env.DATABASE_URL ?? '';

describe('MySQL jobs integration', () => {
  let canRun = false;
  let moduleRef: TestingModule | undefined;
  let jobs: JobsService;
  let worker: JobsWorkerService;
  let diagnostics: JobsDiagnosticsService;
  let prisma: PrismaClient;

  beforeAll(async () => {
    if (!databaseUrl.startsWith('mysql://') || databaseUrl.includes('replace_with')) {
      return;
    }

    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    try {
      await prisma.$queryRaw`SELECT 1`;
      canRun = true;
    } catch {
      canRun = false;
    }

    if (!canRun) {
      await prisma.$disconnect();
      return;
    }

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
          validate: validateEnv,
        }),
        PrismaModule,
        JobsModule,
      ],
    }).compile();

    await moduleRef.init();
    jobs = moduleRef.get(JobsService);
    worker = moduleRef.get(JobsWorkerService);
    diagnostics = moduleRef.get(JobsDiagnosticsService);
  }, 60_000);

  afterAll(async () => {
    if (moduleRef) {
      await moduleRef.close();
    }
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  it('connects to the Inspect MySQL database', async () => {
    if (!canRun) {
      console.warn('Skipping MySQL integration: DATABASE_URL not reachable');
      return;
    }
    await expect(prisma.$queryRaw`SELECT DATABASE() AS db`).resolves.toBeTruthy();
  });

  it('inserts, claims, and completes a diagnostic job', async () => {
    if (!canRun) {
      console.warn('Skipping job lifecycle integration');
      return;
    }

    const job = await jobs.enqueueDiagnostics();
    expect(job.status).toBe(JobStatus.pending);

    const claimed = await jobs.claimNextJob();
    expect(claimed?.id).toBe(job.id);
    expect(claimed?.status).toBe(JobStatus.processing);

    await jobs.processClaimedJob(claimed!);
    const done = await jobs.getJob(job.id);
    expect(done?.status).toBe(JobStatus.completed);
  });

  it('does not allow two workers to claim the same job', async () => {
    if (!canRun) {
      console.warn('Skipping concurrent claim integration');
      return;
    }

    await prisma.backgroundJob.deleteMany({ where: { status: JobStatus.pending } });
    const job = await jobs.enqueueDiagnostics();
    const first = await jobs.claimNextJob();
    const second = await jobs.claimNextJob();

    expect(first?.id).toBe(job.id);
    expect(second).toBeNull();

    if (first) {
      await jobs.completeJob(first.id);
    }
  });

  it('recovers jobs with expired leases', async () => {
    if (!canRun) {
      console.warn('Skipping lease recovery integration');
      return;
    }

    const job = await jobs.enqueueDiagnostics();
    await prisma.backgroundJob.update({
      where: { id: job.id },
      data: {
        status: JobStatus.processing,
        lockedBy: 'dead-worker',
        lockedUntil: new Date(Date.now() - 60_000),
        attempts: 1,
      },
    });

    const claimed = await jobs.claimNextJob();
    expect(claimed?.id).toBe(job.id);
    expect(claimed?.lockedBy).toBe(jobs.getWorkerId());
    await jobs.completeJob(claimed!.id);
  });

  it('retries then fails after max attempts', async () => {
    if (!canRun) {
      console.warn('Skipping retry integration');
      return;
    }

    jobs.registerHandler('test.fail', async () => {
      throw new Error('intentional failure');
    });

    const job = await jobs.enqueue('test.fail', { n: 1 }, { maxAttempts: 2 });
    const first = await jobs.claimNextJob();
    expect(first?.id).toBe(job.id);
    await jobs.processClaimedJob(first!);

    let current = await jobs.getJob(job.id);
    expect(current?.status).toBe(JobStatus.pending);

    // Make it runnable immediately.
    await prisma.backgroundJob.update({
      where: { id: job.id },
      data: { runAt: new Date(Date.now() - 1000) },
    });

    const second = await jobs.claimNextJob();
    expect(second?.id).toBe(job.id);
    await jobs.processClaimedJob(second!);

    current = await jobs.getJob(job.id);
    expect(current?.status).toBe(JobStatus.failed);
  });

  it('runs end-to-end diagnostics against MySQL jobs', async () => {
    if (!canRun) {
      console.warn('Skipping diagnostics integration');
      return;
    }

    expect(worker.isReady()).toBe(true);
    const result = await diagnostics.getDiagnostics();
    expect(result.status).toBe('ok');
    expect(result.backend).toBe('mysql-jobs');
  });

  it('shuts down without claiming new jobs', async () => {
    if (!canRun) {
      console.warn('Skipping shutdown integration');
      return;
    }

    jobs.beginShutdown();
    await expect(jobs.claimNextJob()).resolves.toBeNull();
  });
});
