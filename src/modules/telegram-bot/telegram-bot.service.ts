import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class TelegramBotService {
  private readonly logger = new Logger(TelegramBotService.name);
  private readonly baseUrl = 'https://api.telegram.org/bot';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Generic Method to send message to Telegram user
   */
  async sendMessage(chatId: string, message: string) {
    const botToken = this.configService.get<string>('bot.telegramToken');
    if (!botToken) {
      this.logger.error('Thiếu TELEGRAM_BOT_TOKEN trong cấu hình');
      return;
    }

    const url = `${this.baseUrl}${botToken}/sendMessage`;
    try {
      await lastValueFrom(
        this.httpService.post(url, { chat_id: chatId, text: message })
      );
      this.logger.log(`[Telegram] Gửi tin nhắn thành công tới ${chatId}`);
    } catch (error: any) {
      this.logger.error(`[Telegram] Lỗi khi gửi tin nhắn: ${error.message}`);
    }
  }
}
