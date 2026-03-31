import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { validate } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { OcrModule } from './modules/ocr/ocr.module';
import { TransactionModule } from './modules/transaction/transaction.module';
import { UserModule } from './modules/user/user.module';
import { ExpenseModule } from './modules/expense/expense.module';
import { ZaloBotModule } from './modules/zalo-bot/zalo-bot.module';
import { TelegramBotModule } from './modules/telegram-bot/telegram-bot.module';

import { ChatModule } from './modules/chat/chat.module';
import { AiModule } from './modules/ai/ai.module';
import { StorageModule } from './modules/storage/storage.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ReportModule } from './modules/report/report.module';
import { CronModule } from './modules/cron/cron.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [configuration],
      validate,
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    ChatModule,
    AiModule,
    StorageModule,
    UserModule,
    OcrModule,
    TransactionModule,
    ExpenseModule,
    ZaloBotModule,
    TelegramBotModule,
    ReportModule,
    CronModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
