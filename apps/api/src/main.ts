import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { AppConfig } from './config/configuration';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const config = app.get(ConfigService<AppConfig, true>);
  const logger = new Logger('Bootstrap');

  app.enableShutdownHooks();

  app.use(cookieParser());

  app.setGlobalPrefix('api/v1', {
    exclude: ['healthz', 'readyz'],
  });

  // Single configured origin only (never '*') with credentials for session cookies.
  app.enableCors({
    origin: config.get('api.corsOrigin', { infer: true }),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter(config.get('nodeEnv', { infer: true })));

  const host = config.get('api.host', { infer: true });
  const port = config.get('api.port', { infer: true });

  await app.listen(port, host);
  logger.log(`Inspect API listening on http://${host}:${port}`);
  logger.log(`Liveness:  http://${host}:${port}/healthz`);
  logger.log(`Readiness: http://${host}:${port}/readyz`);
  logger.log(`Metadata:  http://${host}:${port}/api/v1`);
}

void bootstrap();
