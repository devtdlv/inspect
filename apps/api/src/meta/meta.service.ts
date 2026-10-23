import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppMetadata } from '@inspect/shared';
import { AppConfig } from '../config/configuration';

@Injectable()
export class MetaService {
  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  getMetadata(): AppMetadata {
    return {
      name: this.config.get('app.name', { infer: true }),
      version: this.config.get('app.version', { infer: true }),
      environment: this.config.get('nodeEnv', { infer: true }),
      docs: '/api/v1',
    };
  }
}
