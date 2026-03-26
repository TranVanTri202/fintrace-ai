import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramBotController } from './telegram-bot.controller';
import { ExpenseModule } from '../expense/expense.module';

@Module({
  imports: [
    HttpModule,
    ExpenseModule,
  ],
  providers: [TelegramBotService],
  controllers: [TelegramBotController],
  exports: [TelegramBotService],
})
export class TelegramBotModule {}
