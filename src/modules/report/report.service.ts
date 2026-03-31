import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TelegramBotService } from '../telegram-bot/telegram-bot.service';
import { ZaloBotService } from '../zalo-bot/zalo-bot.service';
import { TransactionService } from '../transaction/transaction.service';
import { UserService } from '../user/user.service';

@Injectable()
export class ReportService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly transactionService: TransactionService,
    private readonly telegramBotService: TelegramBotService,
    private readonly zaloBotService: ZaloBotService,
  ) {}

  async onApplicationBootstrap() {
    this.logger.log('ReportService initialized. Waiting for cron tasks...');
  }

  async sendMonthlyReport() {
    const users = await this.userService.findAllUsers();
    
    // Xác định khoảng thời gian tháng trước
    const now = new Date();
    const firstDayPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const monthName = firstDayPrevMonth.toLocaleString('vi-VN', { month: 'long', year: 'numeric' });

    for (const user of users) {
      try {
        const totalAmount = await this.transactionService.getTotalSpendingByRange(user.id, firstDayPrevMonth, lastDayPrevMonth);
        
        if (totalAmount === 0) {
          this.logger.log(`User ${user.fullName || user.id} không có chi tiêu trong tháng ${monthName}. Bỏ qua báo cáo.`);
          continue;
        }

        const highestDay = await this.transactionService.getHighestSpendingDay(user.id, firstDayPrevMonth, lastDayPrevMonth);
        const lowestDay = await this.transactionService.getLowestSpendingDay(user.id, firstDayPrevMonth, lastDayPrevMonth);

        const reportMessage = this.formatReport(
          user.fullName || 'bạn',
          monthName,
          Number(totalAmount),
          highestDay,
          lowestDay
        );

        // Gửi qua Telegram nếu có
        if (user.telegramId) {
          await this.telegramBotService.sendMessage(user.telegramId, reportMessage);
        }

        // Gửi qua Zalo nếu có
        if (user.zaloId) {
          await this.zaloBotService.sendMessage(user.zaloId, reportMessage);
        }

        this.logger.log(`Đã gửi báo cáo tháng ${monthName} cho user: ${user.fullName || user.id}`);
      } catch (error: any) {
        this.logger.error(`Lỗi khi gửi báo cáo cho user ${user.id}: ${error.message}`);
      }
    }
  }

  private formatReport(name: string, month: string, total: number, highest: any, lowest: any): string {
    const formatCurrency = (val: number) => val.toLocaleString('vi-VN') + ' VND';
    const formatDate = (date: Date) => date.toLocaleDateString('vi-VN');

    let msg = `📊 *BÁO CÁO CHI TIÊU ${month.toUpperCase()}*\n\n`;
    msg += `Chào ${name}, FinTrace đã tổng hợp chi tiêu của bạn trong tháng vừa qua:\n\n`;
    msg += `💰 *Tổng chi tiêu:* ${formatCurrency(total)}\n`;
    
    if (highest) {
      msg += `📈 *Ngày dùng nhiều nhất:* ${formatDate(highest.date)} (${formatCurrency(Number(highest.totalAmount))})\n`;
    }
    
    if (lowest) {
      msg += `📉 *Ngày dùng ít nhất:* ${formatDate(lowest.date)} (${formatCurrency(Number(lowest.totalAmount))})\n`;
    }

    msg += `\nChúc bạn quản lý tài chính hiệu quả hơn trong tháng tới! 🚀`;
    return msg;
  }
}
