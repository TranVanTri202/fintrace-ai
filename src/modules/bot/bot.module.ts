import { Module } from '@nestjs/common';
import { TelegramController } from './controllers/telegram.controller';
import { ZaloController } from './controllers/zalo.controller';
import { BotService } from './bot.service';
import { OcrModule } from '../ocr/ocr.module';
import { TransactionModule } from '../transaction/transaction.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    OcrModule,
    TransactionModule,
    UserModule,
  ],
  controllers: [
    TelegramController,
    ZaloController,
  ],
  providers: [BotService],
})
export class BotModule {}
