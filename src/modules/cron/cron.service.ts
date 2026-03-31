import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ReportService } from '../report/report.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(private readonly reportService: ReportService) {}

  /**
   * Báo cáo chi tiêu hàng tháng
   * Chạy vào 08:00 sáng ngày 1 hàng tháng
   */
  @Cron('0 8 1 * *')
  async handleMonthlyReportCron() {
    this.logger.log('--- [Monthly Report Cron] Đang bắt đầu gửi báo cáo chi tiêu hàng tháng ---');
    try {
      await this.reportService.sendMonthlyReport();
      this.logger.log('--- [Monthly Report Cron] Hoàn thành gửi báo cáo chi tiêu hàng tháng ---');
    } catch (error: any) {
      this.logger.error(`--- [Monthly Report Cron] Lỗi: ${error.message} ---`);
    }
  }

}
