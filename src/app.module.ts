import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { BotModule } from './modules/bot/bot.module';
import { OcrModule } from './modules/ocr/ocr.module';
import { TransactionModule } from './modules/transaction/transaction.module';
import { UserModule } from './modules/user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [configuration],
    }),
    DatabaseModule,
    UserModule,
    OcrModule,
    TransactionModule,
    BotModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
