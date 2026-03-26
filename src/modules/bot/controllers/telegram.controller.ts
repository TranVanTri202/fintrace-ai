import { Controller, Post, Body, Headers, Logger, Param } from '@nestjs/common';
import { BotService } from '../bot.service';

@Controller('webhook/telegram')
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name);

  constructor(private readonly botService: BotService) {}

  @Post(':botId')
  async handleTelegramWebhook(
    @Param('botId') botId: string,
    @Body() payload: any
  ) {
    this.logger.log(`Nhận webhook Telegram cho Bot: ${botId}`);
    
    const message = payload.message;
    if (!message) return 'OK'; // Bỏ qua nếu không phải tin nhắn

    const chatId = message.chat.id.toString();
    const fullName = message.from.first_name + ' ' + (message.from.last_name || '');
    
    // Nếu có dạng gửi ảnh (photo)
    if (message.photo && message.photo.length > 0) {
      // Telegram trả ảnh theo array (sizes)
      const maxPhoto = message.photo[message.photo.length - 1];
      const fileId = maxPhoto.file_id;

      // Note: Bình thường với Telegram, ta phải gọi getFile để lấy url thực tế 
      // Nhưng ở đây mock imageUrl tạm thời, hoặc thay bằng logic call API lấy direct URL.
      const mockImageUrl = `https://api.telegram.org/bot<TOKEN>/getFile/${fileId}`;

      const processResult = await this.botService.handleIncomingReceipt(
        botId,
        chatId,
        'TELEGRAM',
        mockImageUrl,
        fullName
      );

      // Reply back
      await this.botService.sendMessage('TELEGRAM', chatId, processResult.message);
    } else {
      await this.botService.sendMessage('TELEGRAM', chatId, 'Vui lòng gửi ảnh hóa đơn để FinTrace phân tích!');
    }

    return 'OK'; // Phải trả về OK để Telegram không gửi lại Webhook
  }
}
