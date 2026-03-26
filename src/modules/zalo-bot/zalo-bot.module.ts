import { Module } from '@nestjs/common';
import { ZaloBotService } from './zalo-bot.service';
import { ZaloBotController } from './zalo-bot.controller';
import { ZaloBotListener } from './zalo-bot.listener';
import { ExpenseModule } from '../expense/expense.module';

@Module({
  imports: [ExpenseModule],
  providers: [ZaloBotService, ZaloBotListener],
  controllers: [ZaloBotController],
  exports: [ZaloBotService, ZaloBotListener],
})
export class ZaloBotModule {}
