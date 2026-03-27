import { Injectable, Logger } from '@nestjs/common';
import { ExpenseService } from '../expense/expense.service';
import { BOT_PLATFORM, USER_DISPLAY_NAMES } from '../../common/constants/platform.constant';
import { ChatService } from '../chat/chat.service';
import { UserService } from '../user/user.service';
import { MessageDirection } from '@prisma/client';
import { AiService } from '../ai/ai.service';
import { TransactionService } from '../transaction/transaction.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ZaloBotListener {
  private readonly logger = new Logger(ZaloBotListener.name);

  constructor(
    private readonly expenseService: ExpenseService,
    private readonly chatService: ChatService,
    private readonly userService: UserService,
    private readonly aiService: AiService,
    private readonly transactionService: TransactionService,
  ) {}

  /**
   * Khởi chạy trình lắng nghe sự kiện từ zca-js cho một instance cụ thể
   */
  async listen(botId: string, api: any) {
    if (!api.listener) {
      this.logger.error(`Bot ${botId} không có thuộc tính listener, không thể khởi tạo!`);
      return;
    }

    // Khởi chạy ngầm
    api.listener.start();

    api.listener.on('message', async (message: any) => {
      // message.type: 0 là UserMessage (Cá nhân), 1 là GroupMessage (Nhóm)
      const isGroup = message.type === 1;
      if (isGroup) return;

      const rawData = message.data || {};
      const msgType = rawData.msgType;
      const senderId = message.threadId;

      this.logger.debug(`[ZaloBot] Nhận tin nhắn loại: ${msgType} từ: ${senderId}`);

      try {
        // Nhận diện người dùng trước
        const user = await this.userService.getOrCreateUserByPlatform(
          senderId,
          BOT_PLATFORM.ZALO,
          rawData.dName || USER_DISPLAY_NAMES.ZALO_USER
        );

        switch (msgType) {
          case 'webchat':
            await this.handleTextMessage(api, botId, user.id, senderId, rawData);
            break;

          case 'chat.photo':
            await this.handleImageMessage(api, botId, user.id, senderId, rawData);
            break;

          default:
            this.logger.log(`Bỏ qua loại tin nhắn chưa hỗ trợ: ${msgType}`);
            break;
        }
      } catch (error: any) {
        this.logger.error(`❌ Lỗi xử lý tin nhắn Zalo cho Bot ${botId}:`, error.stack || error);
      }
    });

    this.logger.log(`✅ Đã kích hoạt luồng Listener riêng cho Bot ID: ${botId}`);
  }

  /**
   * Xử lý tin nhắn văn bản
   */
  private async handleTextMessage(api: any, botId: string, userId: string, senderId: string, data: any) {
    try {
      this.logger.log(`💬 Nhận tin nhắn văn bản từ: ${senderId}`);

      // Lưu tin nhắn đến (INCOMING)
      await this.chatService.saveMessage({
        botId,
        userId,
        direction: MessageDirection.INCOMING,
        msgType: data.msgType,
        content: data.content,
        rawPayload: data,
      });

      // Lấy câu trả lời từ AI (bao gồm 10 tin nhắn gần nhất làm context)
      let replyMsg = await this.aiService.getChatResponse(botId, userId);
      
      // Kiểm tra xem AI có yêu cầu xuất Excel không thông qua Tag đặc biệt
      if (replyMsg.includes('[TRIGGER_EXPORT_EXCEL]')) {
        this.logger.log('📊 AI yêu cầu xuất báo cáo Excel...');
        
        // Xóa Tag khỏi tin nhắn trước khi gửi cho User
        replyMsg = replyMsg.replace('[TRIGGER_EXPORT_EXCEL]', '').trim();

        await api.sendMessage({ msg: 'Đợi mình một xíu, mình đang tạo file báo cáo chi tiêu cho bạn đây... ⏳' }, senderId, 0);

        const buffer = await this.transactionService.generateExcelExport(userId);
        const fileName = `Bao_cao_chi_tieu_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.xlsx`;

        // Gửi file trực tiếp từ Buffer
        
        await api.sendMessage(
          {
            msg: 'Dạ, file báo cáo chi tiêu của bạn đã được tạo thành công! 📊',
            attachments: [
              {
                data: buffer,
                filename: fileName,
                metadata: {
                  totalSize: buffer.length,
                },
              },
            ],
          },
          senderId,
          0 
        );

        if (!replyMsg) {
          replyMsg = 'Bạn có thể tải file ở trên để xem chi tiết nhé. 😊';
        }
      }

      // Gửi đi theo signature chuẩn của user: api.sendMessage({ msg: '...' }, id, 0)
      await api.sendMessage({ msg: replyMsg }, senderId, 0);

      // Lưu tin nhắn đi (OUTGOING)
      await this.chatService.saveMessage({
        botId,
        userId,
        direction: MessageDirection.OUTGOING,
        msgType: 'webchat',
        content: replyMsg,
      });
    } catch (error: any) {
      this.logger.error(`❌ Lỗi trong handleTextMessage (Bot ${botId}):`, error.stack || error);
    }
  }

  /**
   * Xử lý tin nhắn hình ảnh (hóa đơn)
   */
  private async handleImageMessage(api: any, botId: string, userId: string, senderId: string, data: any) {
    try {
      this.logger.log(`📸 Nhận được ảnh hóa đơn từ: ${senderId}`);
      
      const imageUrl = data.content?.href || data.content;

      // Lưu log tin nhắn ảnh đến
      await this.chatService.saveMessage({
        botId,
        userId,
        direction: MessageDirection.INCOMING,
        msgType: 'chat.photo',
        content: imageUrl,
        rawPayload: data,
      });

      if (!imageUrl) return;

      // Gọi OCR xử lý AI
      const result = await this.expenseService.processReceiptImage(
        botId,
        senderId,
        BOT_PLATFORM.ZALO,
        imageUrl,
        data.dName || USER_DISPLAY_NAMES.ZALO_USER
      );

      // Trả lời kết quả theo signature chuẩn: { msg }, id, 0
      await api.sendMessage({ msg: result.message }, senderId, 0);

      // Lưu log tin trả lời
      await this.chatService.saveMessage({
        botId,
        userId,
        direction: MessageDirection.OUTGOING,
        msgType: 'webchat',
        content: result.message,
      });
    } catch (error: any) {
      this.logger.error(`❌ Lỗi trong handleImageMessage (Bot ${botId}):`, error.stack || error);
    }
  }
}
