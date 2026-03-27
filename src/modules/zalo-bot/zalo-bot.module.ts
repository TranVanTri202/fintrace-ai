import { Module } from '@nestjs/common';
import { ZaloBotService } from './zalo-bot.service';
import { ZaloBotController } from './zalo-bot.controller';
import { ZaloBotListener } from './zalo-bot.listener';
import { ExpenseModule } from '../expense/expense.module';
import { UserModule } from '../user/user.module';
import { ChatModule } from '../chat/chat.module';
import { AiModule } from '../ai/ai.module';
import { TransactionModule } from '../transaction/transaction.module';

@Module({
  imports: [
    ExpenseModule,
    UserModule,
    ChatModule,
    AiModule,
    TransactionModule,
  ],
  providers: [ZaloBotService, ZaloBotListener],
  controllers: [ZaloBotController],
  exports: [ZaloBotService, ZaloBotListener],
})
export class ZaloBotModule {}
