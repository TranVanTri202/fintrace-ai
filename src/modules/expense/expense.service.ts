import { Injectable, Logger } from '@nestjs/common';
import { OcrService } from '../ocr/ocr.service';
import { TransactionService } from '../transaction/transaction.service';
import { UserService } from '../user/user.service';
import { Platform } from '@prisma/client';
import { StorageService } from '../storage/storage.service';
import { AiService } from '../ai/ai.service';
import axios from 'axios';

@Injectable()
export class ExpenseService {
  private readonly logger = new Logger(ExpenseService.name);

  constructor(
    private readonly ocrService: OcrService,
    private readonly transactionService: TransactionService,
    private readonly userService: UserService,
    private readonly storageService: StorageService,
    private readonly aiService: AiService,
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

      // 1. Tải ảnh về để xử lý (Tránh lỗi OpenAI không tải được từ Supabase URL)
      this.logger.log(`📥 Đang tải ảnh từ ${platform} để xử lý...`);
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data, 'binary');
      const base64 = buffer.toString('base64');

      // 2. Upload lên Supabase Storage (luôn upload để có link lưu vào DB)
      const publicUrl = await this.storageService.uploadBuffer(
        buffer,
        response.headers['content-type'] || 'image/jpeg'
      );

      // 3. Sử dụng Base64 để gọi OpenAI (Nhanh và ổn định hơn gửi URL)
      const extractedData = await this.ocrService.extractReceiptData(base64);

      // Kiểm tra nếu AI không nhận diện được hóa đơn (trường hợp chụp ảnh linh tinh)
      if (!extractedData.vendor || extractedData.vendor === 'Tên cửa hàng' || extractedData.vendor === 'null' || extractedData.amount === 0) {
        return {
          success: false,
          message: 'Ơ, hình như đây không phải là ảnh hóa đơn mua hàng rồi. Bạn vui lòng chụp lại rõ nét hơn nhé! 📸',
        };
      }

      // 3. Lưu giao dịch với link ảnh đã đẩy lên Supabase
      const transaction = await this.transactionService.saveExtractedReceipt(
        user.id,
        botId,
        publicUrl,
        extractedData
      );

      // 4. Tạo câu trả lời hóm hỉnh từ AI
      const aiMessage = await this.aiService.generateTransactionConfirmation(extractedData);
      
      return {
        success: true,
        message: aiMessage,
        transaction,
      };
    } catch (error: any) {
      if (error.message === 'DUPLICATE_TRANSACTION') {
        return {
          success: false,
          message: '⚠️ Hình như hóa đơn này bạn đã lưu trước đó rồi nha. Mình không lưu lại nữa đâu nè!',
        };
      }
      this.logger.error(`❌ Lỗi xử lý hóa đơn cho ${platformId}: ${error.message}`);
      return {
        success: false,
        message: 'Xin lỗi, tôi không phân tích được hóa đơn này. Vui lòng chụp rõ lại nhé.',
      };
    }
  }
}
