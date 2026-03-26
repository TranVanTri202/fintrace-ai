import { Controller, Post, Body, Logger, Param } from '@nestjs/common';
import { ExpenseService } from '../expense/expense.service';
import { TelegramBotService } from './telegram-bot.service';
import { BOT_PLATFORM, USER_DISPLAY_NAMES } from '../../common/constants/platform.constant';

@Controller('webhook/telegram')
export class TelegramBotController {
  private readonly logger = new Logger(TelegramBotController.name);

  constructor(
    private readonly telegramBotService: TelegramBotService,
    private readonly expenseService: ExpenseService,
  ) {}

  @Post(':botId')
  async handleTelegramWebhook(
    @Param('botId') botId: string,
    @Body() payload: any
  ) {
    this.logger.log(`Nhận webhook Telegram cho Bot ID: ${botId}`);
    
    const message = payload.message;
    if (!message) return 'OK';

    const chatId = message.chat.id.toString();
    const fullName = `${message.from.first_name} ${message.from.last_name || ''}`;
    
    // Nếu tin nhắn chứa ảnh (photo)
    if (message.photo && message.photo.length > 0) {
      const maxPhoto = message.photo[message.photo.length - 1]; // Lấy size lớn nhất
      const fileId = maxPhoto.file_id;

      // Giả lập link ảnh từ Telegram API (thường cần dùng getFile API để lấy link thật)
      const imageUrl = `https://api.telegram.org/file/bot<TOKEN>/${fileId}`; 

      this.logger.log(`Nhận ảnh từ Telegram User: ${chatId} (${fullName})`);
      
      const processResult = await this.expenseService.processReceiptImage(
        botId,
        chatId,
        BOT_PLATFORM.TELEGRAM,
        imageUrl,
        fullName || USER_DISPLAY_NAMES.TELEGRAM_USER
      );

      // Trả kết quả AI qua tin nhắn Telegram
      await this.telegramBotService.sendMessage(chatId, processResult.message);
    } else if (message.text) {
      await this.telegramBotService.sendMessage(chatId, 'Chào bạn! Hãy gửi ảnh hóa đơn để FinTrace phân tích và ghi lại chi tiêu nhé.');
    }

    return 'OK'; // Phải trả về OK để Telegram không gửi lại Webhook
  }
}
