import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ExtractedReceiptData } from '../ocr/ocr.service';
import { Category } from '@prisma/client';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async saveExtractedReceipt(
    userId: string,
    botId: string,
    imageUrl: string,
    extractedData: ExtractedReceiptData,
    rawOcrText?: string,
  ) {
    this.logger.log(`Bắt đầu lưu giao dịch cho user ID: ${userId} qua bot ID: ${botId}`);
    
    try {
      const transaction = await this.prisma.transaction.create({
        data: {
          userId,
          botId,
          amount: extractedData.amount || 0,
          vendor: extractedData.vendor,
          category: extractedData.category as Category,
          rawOcrText: rawOcrText,
          aiMetadata: extractedData as any,
          imageUrl: imageUrl,
          transactionDate: extractedData.due_date ? new Date(extractedData.due_date) : new Date(),
        },
      });

      this.logger.log(`Lưu thành công Transaction ID: ${transaction.id}`);
      return transaction;
    } catch (error) {
      this.logger.error('Gặp lỗi trong quá trình lưu Transaction', error);
      throw error;
    }
  }
}
