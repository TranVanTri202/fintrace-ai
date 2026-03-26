import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OcrService } from '../ocr/ocr.service';
import { TransactionService } from '../transaction/transaction.service';
import { UserService } from '../user/user.service';
import { Platform } from '@prisma/client';

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly ocrService: OcrService,
    private readonly transactionService: TransactionService,
    private readonly userService: UserService,
  ) {}

  /**
   * Orchestrate receiving an image, extracting data, and saving transaction
   */
  async handleIncomingReceipt(
    botId: string,
    platformId: string,
    platform: Platform,
    imageUrl: string,
    fullName?: string
  ) {
    try {
      this.logger.log(`Nhận hóa đơn từ ${platform} - ID: ${platformId} - Ảnh: ${imageUrl}`);
      
      // 1. Get or create user via UserService
      const user = await this.userService.getOrCreateUserByPlatform(platformId, platform, fullName);

      // 2. Extract Data via AI
      const extractedData = await this.ocrService.extractReceiptData(imageUrl);

      // 3. Save Transaction
      const transaction = await this.transactionService.saveExtractedReceipt(
        user.id,
        botId,
        imageUrl,
        extractedData
      );

      // 4. Return summary to send back to user
      return {
        success: true,
        message: `Đã lưu giao dịch: ${extractedData.vendor} - ${extractedData.amount} VNĐ thuộc danh mục ${extractedData.category}`,
        transaction,
      };
    } catch (error: any) {
      this.logger.error(`Lỗi xử lý hóa đơn cho ${platformId}: ${error.message}`);
      return {
        success: false,
        message: 'Xin lỗi, tôi không thể đọc được hóa đơn này. Vui lòng thử lại với ảnh rõ nét hơn.',
      };
    }
  }

  /**
   * Generic Method to send message to Telegram/Zalo
   * Lấy token từ ConfigService
   */
  async sendMessage(platform: Platform, toId: string, message: string) {
    const telegramToken = this.configService.get<string>('bot.telegramToken');
    const zaloToken = this.configService.get<string>('bot.zaloToken');

    const botToken = platform === 'TELEGRAM' ? telegramToken : zaloToken;
    this.logger.log(`[${platform}] Gửi tin nhắn tới ${toId}: ${message} dùng token ${botToken ? '***' : 'null'}`);
    
    // Thực hiện logic gọi API theo từng Platform
    // Ví dụ Telegram: POST https://api.telegram.org/bot${botToken}/sendMessage
    // Ví dụ Zalo: POST https://openapi.zalo.me/v2.0/oa/message
  }
}
