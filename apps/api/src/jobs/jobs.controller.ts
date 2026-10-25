import { Controller, Get, HttpStatus, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { SessionGuard } from '../auth/guards/session.guard';
import { JobsDiagnosticsService } from './jobs-diagnostics.service';

/**
 * Operational queue diagnostics. Requires an authenticated session.
 * Future milestones may additionally require an administrator role.
 */
@Controller('diagnostics/queue')
@UseGuards(SessionGuard)
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
