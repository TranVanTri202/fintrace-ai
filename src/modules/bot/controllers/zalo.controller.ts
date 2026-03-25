import { Controller, Post, Body, Headers, Logger, Param } from '@nestjs/common';
import { BotService } from '../bot.service';

@Controller('webhook/zalo')
export class ZaloController {
  private readonly logger = new Logger(ZaloController.name);

  constructor(private readonly botService: BotService) {}

  @Post(':botId')
  async handleZaloWebhook(
    @Param('botId') botId: string,
    @Body() payload: any
  ) {
    this.logger.log(`Nhận webhook Zalo cho Bot: ${botId}`);
    
    // Zalo webhook structure
    const eventName = payload.event_name;
    const sender = payload.sender; // { id: "user_id" }
    const message = payload.message; // {"text": "...", "attachments": [...]}

    if (!payload?.sender?.id) return { success: true };

    const zaloId = sender.id.toString();

    if (eventName === 'user_send_text') {
      await this.botService.sendMessage('ZALO', 'ZALO_ACCESS_TOKEN', zaloId, 'Vui lòng gửi ảnh hóa đơn để FinTrace phân tích!');
    }

    if (eventName === 'user_send_image' && message?.attachments?.length > 0) {
      const attachments = message.attachments;
      const images = attachments.filter(a => a.type === 'image');
      
      if (images.length > 0) {
        // Zalo returns direct image url in payload
        const imageUrl = images[0].payload.url;
        
        const processResult = await this.botService.handleIncomingReceipt(
          botId,
          zaloId,
          'ZALO',
          imageUrl,
          'Zalo User'
        );

        await this.botService.sendMessage('ZALO', 'ZALO_ACCESS_TOKEN', zaloId, processResult.message);
      }
    }

    // Zalo Webhook expects 200 OK 
    return { success: true };
  }
}
