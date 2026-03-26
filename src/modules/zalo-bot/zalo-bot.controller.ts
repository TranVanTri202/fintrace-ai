import { Controller, Post, Body, Logger, Param, Get } from '@nestjs/common';
import { ZaloBotService } from './zalo-bot.service';

@Controller('webhook/zalo')
export class ZaloBotController {
  private readonly logger = new Logger(ZaloBotController.name);

  constructor(
    private readonly zaloBotService: ZaloBotService,
  ) {}

  /**
   * Endpoint để tạo QR code đăng nhập bot mới
   */
  @Get('qr')
  async generateQR() {
    return this.zaloBotService.generateQRCodeAndSaveToDb('Zalo Personal Bot');
  }

  /**
   * Endpoint webhook để nhận sự kiện từ Zalo OA (nếu dùng)
   */
  @Post(':botId')
  async handleZaloWebhook(
    @Param('botId') botId: string,
    @Body() payload: any
  ) {
    this.logger.log(`Nhận webhook Zalo OA cho Bot: ${botId}`);
    // Xử lý payload nếu dùng Zalo OA
    return { success: true };
  }
}
