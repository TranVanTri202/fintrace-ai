import { Injectable, Logger } from '@nestjs/common';
import { OcrService } from '../ocr/ocr.service';
import { TransactionService } from '../transaction/transaction.service';
import { UserService } from '../user/user.service';
import { Platform } from '@prisma/client';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class ExpenseService {
  private readonly logger = new Logger(ExpenseService.name);

  constructor(
    private readonly ocrService: OcrService,
    private readonly transactionService: TransactionService,
    private readonly userService: UserService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Orchestrate receiving an image, extracting data, and saving transaction
   */
  async processReceiptImage(
    botId: string,
    platformId: string,
    platform: Platform,
    imageUrl: string,
    fullName?: string
  ) {
    try {
      this.logger.log(`[ExpenseProcessor] Nhận ảnh hóa đơn từ ${platform} ID: ${platformId}`);
      
      const user = await this.userService.getOrCreateUserByPlatform(platformId, platform, fullName);

      // 1. Upload ảnh lên Supabase Storage để lấy link public ổn định
      const publicUrl = await this.storageService.uploadFromUrl(imageUrl);

      // 2. Sử dụng link Supabase để gọi OpenAI
      const extractedData = await this.ocrService.extractReceiptData(publicUrl);

      // 3. Lưu giao dịch với link ảnh đã đẩy lên Supabase
      const transaction = await this.transactionService.saveExtractedReceipt(
        user.id,
        botId,
        publicUrl,
        extractedData
      );

      return {
        success: true,
        message: `✅ Đã lưu chi tiêu: ${extractedData.vendor} - ${extractedData.amount} VNĐ (${extractedData.category})`,
        transaction,
      };
    } catch (error: any) {
      this.logger.error(`❌ Lỗi xử lý hóa đơn cho ${platformId}: ${error.message}`);
      return {
        success: false,
        message: 'Xin lỗi, tôi không phân tích được hóa đơn này. Vui lòng chụp rõ lại nhé.',
      };
    }
  }
}
