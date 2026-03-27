import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
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
      const transactionDate = extractedData.due_date ? new Date(extractedData.due_date) : new Date();
      const finalDate = isNaN(transactionDate.getTime()) ? new Date() : transactionDate;

      // Kiểm tra trùng lặp (Cùng cửa hàng, cùng số tiền, cùng ngày) cho cùng một User
      const existing = await this.prisma.transaction.findFirst({
        where: {
          userId,
          vendor: extractedData.vendor,
          amount: extractedData.amount || 0,
          transactionDate: finalDate,
        },
      });

      if (existing) {
        this.logger.warn(`⚠️ Phát hiện giao dịch trùng lặp cho user ${userId} tại ${extractedData.vendor}`);
        throw new Error('DUPLICATE_TRANSACTION');
      }

      const transaction = await this.prisma.transaction.create({
        data: {
          userId,
          botId,
          amount: Math.abs(Number(extractedData.amount || 0)),
          vendor: extractedData.vendor,
          category: extractedData.category as Category,
          rawOcrText: rawOcrText,
          aiMetadata: extractedData as any,
          imageUrl: imageUrl,
          transactionDate: finalDate,
        },
      });

      this.logger.log(`Lưu thành công Transaction ID: ${transaction.id}`);
      return transaction;
    } catch (error) {
      this.logger.error('Gặp lỗi trong quá trình lưu Transaction', error);
      throw error;
    }
  }
  async getHighestSpendingDay(userId: string) {
    try {
      this.logger.log(`🔍 Đang tìm ngày tiêu tiền nhiều nhất cho user: ${userId}`);
      
      const result = await this.prisma.transaction.groupBy({
        by: ['transactionDate'],
        where: { userId },
        _sum: {
          amount: true,
        },
        orderBy: {
          _sum: {
            amount: 'desc',
          },
        },
        take: 1,
      });

      if (result.length === 0) return null;

      return {
        date: result[0].transactionDate,
        totalAmount: result[0]._sum.amount,
      };
    } catch (error: any) {
      this.logger.error(`❌ Lỗi khi tìm ngày tiêu tiền nhiều nhất: ${error.message}`);
      return null;
    }
  }

  /**
   * Tìm ngày tiêu tiền ít nhất (nhưng phải có chi tiêu > 0)
   */
  async getLowestSpendingDay(userId: string) {
    try {
      this.logger.log(`🔍 Đang tìm ngày tiêu tiền ít nhất cho user: ${userId}`);
      
      const result = await this.prisma.transaction.groupBy({
        by: ['transactionDate'],
        where: { userId, amount: { gt: 0 } },
        _sum: {
          amount: true,
        },
        orderBy: {
          _sum: {
            amount: 'asc',
          },
        },
        take: 1,
      });

      if (result.length === 0) return null;

      return {
        date: result[0].transactionDate,
        totalAmount: result[0]._sum.amount,
      };
    } catch (error: any) {
      this.logger.error(`❌ Lỗi khi tìm ngày tiêu tiền ít nhất: ${error.message}`);
      return null;
    }
  }

  /**
   * Tính tổng tiền trong một khoảng thời gian
   */
  async getTotalSpendingByRange(userId: string, startDate: Date, endDate: Date) {
    try {
      this.logger.log(`🔍 Đang tính tổng chi tiêu từ ${startDate.toISOString()} đến ${endDate.toISOString()} cho user: ${userId}`);
      
      const aggregate = await this.prisma.transaction.aggregate({
        where: {
          userId,
          transactionDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: {
          amount: true,
        },
      });

      return aggregate._sum.amount || 0;
    } catch (error: any) {
      this.logger.error(`❌ Lỗi khi tính tổng chi tiêu theo khoảng: ${error.message}`);
      return 0;
    }
  }

  /**
   * Lấy danh sách giao dịch chi tiết cho một ngày cụ thể
   */
  async getTransactionsByDate(userId: string, date: Date) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      this.logger.log(`🔍 Đang lấy danh sách chi tiêu ngày ${startOfDay.toISOString()} cho user: ${userId}`);

      const transactions = await this.prisma.transaction.findMany({
        where: {
          userId,
          transactionDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return transactions.map(t => ({
        vendor: t.vendor,
        amount: Math.abs(Number(t.amount)), // Chuyển sang số dương để AI báo dễ nghe
        category: t.category,
        time: t.transactionDate.toLocaleTimeString('vi-VN'),
      }));
    } catch (error: any) {
      this.logger.error(`❌ Lỗi khi lấy danh sách chi tiêu theo ngày: ${error.message}`);
      return [];
    }
  }
}
