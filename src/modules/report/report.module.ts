import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { UserModule } from '../user/user.module';
import { TransactionModule } from '../transaction/transaction.module';
import { TelegramBotModule } from '../telegram-bot/telegram-bot.module';
import { ZaloBotModule } from '../zalo-bot/zalo-bot.module';


@Module({
  imports: [
    UserModule,
    TransactionModule,
    TelegramBotModule,
    ZaloBotModule,
  ],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule {}
