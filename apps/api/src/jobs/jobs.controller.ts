import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { JobsDiagnosticsService } from './jobs-diagnostics.service';

@Controller('diagnostics/queue')
export class JobsController {
  constructor(private readonly jobsDiagnostics: JobsDiagnosticsService) {}

  @Get()
  async getQueueDiagnostics(@Res({ passthrough: true }) res: Response) {
    const result = await this.jobsDiagnostics.getDiagnostics();
    if (result.status !== 'ok') {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return result;
  }
}
