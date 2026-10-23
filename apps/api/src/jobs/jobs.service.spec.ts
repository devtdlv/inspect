import { ConfigService } from '@nestjs/config';
import { JobStatus } from '@prisma/client';
import { AppConfig } from '../config/configuration';
import { PrismaService } from '../prisma/prisma.service';
import { JobsService } from './jobs.service';

describe('JobsService', () => {
  const config = {
    get: jest.fn().mockReturnValue(30),
  } as unknown as ConfigService<AppConfig, true>;

  it('enqueues a pending job', async () => {
    const created = {
      id: 'job-1',
      type: 'diagnostics.ping',
      status: JobStatus.pending,
    };
    const prisma = {
      backgroundJob: {
        create: jest.fn().mockResolvedValue(created),
      },
    } as unknown as PrismaService;

    const service = new JobsService(prisma, config);
    const job = await service.enqueueDiagnostics();

    expect(job.id).toBe('job-1');
    expect(prisma.backgroundJob.create).toHaveBeenCalled();
  });

  it('completes a job', async () => {
    const prisma = {
      backgroundJob: {
        update: jest.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaService;
    const service = new JobsService(prisma, config);

    await service.completeJob('job-1');

    expect(prisma.backgroundJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-1' },
        data: expect.objectContaining({ status: JobStatus.completed }),
      }),
    );
  });

  it('retries a failed job when attempts remain', async () => {
    const prisma = {
      backgroundJob: {
        update: jest.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaService;
    const service = new JobsService(prisma, config);

    await service.failJob(
      {
        id: 'job-1',
        type: 'diagnostics.ping',
        attempts: 1,
        maxAttempts: 3,
      } as never,
      new Error('boom'),
    );

    expect(prisma.backgroundJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: JobStatus.pending }),
      }),
    );
  });

  it('marks job failed when max attempts exhausted', async () => {
    const prisma = {
      backgroundJob: {
        update: jest.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaService;
    const service = new JobsService(prisma, config);

    await service.failJob(
      {
        id: 'job-1',
        type: 'diagnostics.ping',
        attempts: 3,
        maxAttempts: 3,
      } as never,
      new Error('boom'),
    );

    expect(prisma.backgroundJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: JobStatus.failed }),
      }),
    );
  });

  it('stops claiming after shutdown begins', async () => {
    const prisma = {
      $transaction: jest.fn(),
    } as unknown as PrismaService;
    const service = new JobsService(prisma, config);
    service.beginShutdown();

    await expect(service.claimNextJob()).resolves.toBeNull();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
