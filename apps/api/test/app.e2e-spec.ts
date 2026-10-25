import { INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { SessionGuard } from '../src/auth/guards/session.guard';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { configuration, validateEnv } from '../src/config/configuration';
import { HealthController } from '../src/health/health.controller';
import { HealthService } from '../src/health/health.service';
import { JobsController } from '../src/jobs/jobs.controller';
import { JobsDiagnosticsService } from '../src/jobs/jobs-diagnostics.service';
import { MetaController } from '../src/meta/meta.controller';
import { MetaService } from '../src/meta/meta.service';

describe('API foundation (http)', () => {
  let app: INestApplication<App>;
  let healthService: HealthService;
  let jobsDiagnostics: JobsDiagnosticsService;
  let sessionGuard: { canActivate: jest.Mock };

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ?? 'mysql://inspect_app:test@127.0.0.1:3306/inspect';

    sessionGuard = {
      canActivate: jest.fn().mockImplementation(() => {
        throw new UnauthorizedException('Authentication required');
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
          validate: validateEnv,
        }),
      ],
      controllers: [HealthController, MetaController, JobsController],
      providers: [
        MetaService,
        {
          provide: HealthService,
          useValue: {
            getLiveness: () => ({
              status: 'ok',
              timestamp: new Date().toISOString(),
            }),
            getReadiness: jest.fn(),
          },
        },
        {
          provide: JobsDiagnosticsService,
          useValue: {
            getDiagnostics: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(SessionGuard)
      .useValue(sessionGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    healthService = moduleFixture.get(HealthService);
    jobsDiagnostics = moduleFixture.get(JobsDiagnosticsService);

    app.setGlobalPrefix('api/v1', {
      exclude: ['healthz', 'readyz'],
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /healthz returns liveness', async () => {
    await request(app.getHttpServer()).get('/healthz').expect(200);
  });

  it('GET /api/v1 returns metadata', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1').expect(200);
    expect(response.body.docs).toBe('/api/v1');
  });

  it('GET /readyz returns 503 when unhealthy', async () => {
    (healthService.getReadiness as jest.Mock).mockResolvedValue({
      status: 'error',
      timestamp: new Date().toISOString(),
      checks: [
        { name: 'mysql', status: 'error', message: 'unavailable' },
        { name: 'mysql-jobs', status: 'ok' },
      ],
    });

    await request(app.getHttpServer()).get('/readyz').expect(503);
  });

  it('GET /readyz returns 200 when healthy', async () => {
    (healthService.getReadiness as jest.Mock).mockResolvedValue({
      status: 'ok',
      timestamp: new Date().toISOString(),
      checks: [
        { name: 'mysql', status: 'ok', latencyMs: 1 },
        { name: 'mysql-jobs', status: 'ok', latencyMs: 1 },
      ],
    });

    await request(app.getHttpServer()).get('/readyz').expect(200);
  });

  it('GET /api/v1/diagnostics/queue requires authentication', async () => {
    await request(app.getHttpServer()).get('/api/v1/diagnostics/queue').expect(401);
  });

  it('GET /api/v1/diagnostics/queue returns job diagnostics when authenticated', async () => {
    sessionGuard.canActivate.mockResolvedValueOnce(true);
    (jobsDiagnostics.getDiagnostics as jest.Mock).mockResolvedValue({
      status: 'ok',
      queue: 'background_jobs',
      backend: 'mysql-jobs',
      jobs: { name: 'mysql-jobs', status: 'ok', latencyMs: 2 },
      timestamp: new Date().toISOString(),
    });

    const response = await request(app.getHttpServer())
      .get('/api/v1/diagnostics/queue')
      .expect(200);

    expect(response.body.backend).toBe('mysql-jobs');
  });
});
