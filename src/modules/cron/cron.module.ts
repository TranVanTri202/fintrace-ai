import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { ReportModule } from '../report/report.module';

@Module({
  imports: [
    ReportModule,
  ],
  providers: [CronService],
})
export class CronModule {}
