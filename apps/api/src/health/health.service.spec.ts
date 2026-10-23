import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/configuration';
import { JobsService } from '../jobs/jobs.service';
import { JobsWorkerService } from '../jobs/jobs-worker.service';
import { PrismaService } from '../prisma/prisma.service';
import { HealthService } from './health.service';

describe('HealthService', () => {
  const config = {
    get: jest.fn().mockReturnValue(50),
  } as unknown as ConfigService<AppConfig, true>;

  it('returns liveness without touching dependencies', () => {
    const prisma = { ping: jest.fn() } as unknown as PrismaService;
    const jobs = { pingJobsTable: jest.fn() } as unknown as JobsService;
    const worker = { isReady: jest.fn() } as unknown as JobsWorkerService;
    const service = new HealthService(prisma, config, jobs, worker);

    const result = service.getLiveness();

    expect(result.status).toBe('ok');
    expect(prisma.ping).not.toHaveBeenCalled();
  });

  it('reports ok when mysql and jobs respond', async () => {
    const prisma = { ping: jest.fn().mockResolvedValue(undefined) } as unknown as PrismaService;
    const jobs = {
      pingJobsTable: jest.fn().mockResolvedValue(undefined),
    } as unknown as JobsService;
    const worker = { isReady: jest.fn().mockReturnValue(true) } as unknown as JobsWorkerService;
    const service = new HealthService(prisma, config, jobs, worker);

    const result = await service.getReadiness();

    expect(result.status).toBe('ok');
    expect(result.checks.every((check) => check.status === 'ok')).toBe(true);
  });

  it('reports error when database is unhealthy', async () => {
    const prisma = {
      ping: jest.fn().mockRejectedValue(new Error('db down')),
    } as unknown as PrismaService;
    const jobs = {
      pingJobsTable: jest.fn().mockResolvedValue(undefined),
    } as unknown as JobsService;
    const worker = { isReady: jest.fn().mockReturnValue(true) } as unknown as JobsWorkerService;
    const service = new HealthService(prisma, config, jobs, worker);

    const result = await service.getReadiness();

    expect(result.status).toBe('error');
    expect(result.checks.find((check) => check.name === 'mysql')?.status).toBe('error');
  });

  it('reports error when job infrastructure is unhealthy', async () => {
    const prisma = { ping: jest.fn().mockResolvedValue(undefined) } as unknown as PrismaService;
    const jobs = { pingJobsTable: jest.fn() } as unknown as JobsService;
    const worker = { isReady: jest.fn().mockReturnValue(false) } as unknown as JobsWorkerService;
    const service = new HealthService(prisma, config, jobs, worker);

    const result = await service.getReadiness();

    expect(result.status).toBe('error');
    expect(result.checks.find((check) => check.name === 'mysql-jobs')?.status).toBe('error');
  });
});
