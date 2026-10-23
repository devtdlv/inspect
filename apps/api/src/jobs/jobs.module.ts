import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { JobsController } from './jobs.controller';
import { JobsDiagnosticsService } from './jobs-diagnostics.service';
import { JobsService } from './jobs.service';
import { JobsWorkerService } from './jobs-worker.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [JobsController],
  providers: [JobsService, JobsWorkerService, JobsDiagnosticsService],
  exports: [JobsService, JobsWorkerService, JobsDiagnosticsService],
})
export class JobsModule {}
