import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/configuration';
import { MetaService } from './meta.service';

describe('MetaService', () => {
  it('returns application metadata', () => {
    const values: Record<string, string> = {
      'app.name': 'Inspect',
      'app.version': '0.0.1',
      nodeEnv: 'test',
    };
    const config = {
      get: jest.fn((key: string) => values[key]),
    } as unknown as ConfigService<AppConfig, true>;

    const service = new MetaService(config);
    const meta = service.getMetadata();

    expect(meta).toEqual({
      name: 'Inspect',
      version: '0.0.1',
      environment: 'test',
      docs: '/api/v1',
    });
  });
});
