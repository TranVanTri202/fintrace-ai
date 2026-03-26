import { Injectable, Logger } from '@nestjs/common';
import { ExpenseService } from '../expense/expense.service';
import { BOT_PLATFORM, USER_DISPLAY_NAMES } from '../../common/constants/platform.constant';

@Injectable()
export class ZaloBotListener {
  private readonly logger = new Logger(ZaloBotListener.name);

  constructor(private readonly expenseService: ExpenseService) {}

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
      const { msgType, senderId, isGroup, content } = message;

      // Chỉ xử lý tin nhắn cá nhân (không xử lý trong nhóm)
      if (isGroup) return;

      this.logger.debug(`[ZaloListener] Bot ${botId} nhận message type: ${msgType} từ: ${senderId}`);

      try {
        switch (msgType) {
          case 'chat.photo': {
            const imageUrl = content?.href;
            if (imageUrl) {
              this.logger.log(`📸 Bot ${botId} nhận được ảnh hóa đơn từ: ${senderId}`);
              
              const result = await this.expenseService.processReceiptImage(
                botId,
                senderId,
                BOT_PLATFORM.ZALO,
                imageUrl,
                USER_DISPLAY_NAMES.ZALO_USER
              );
              
              await api.sendMessage({ body: result.message }, senderId);
            }
            break;
          }

          case 'webchat': {
            this.logger.log(`💬 Bot ${botId} nhận được tin nhắn văn bản từ: ${senderId}`);
            await api.sendMessage(
              { body: 'FinTrace đã nhận tin nhắn! Hãy gửi ảnh hóa đơn để tôi bóc tách chi tiêu giúp bạn nhé. 🚀' }, 
              senderId
            );
            break;
          }

          default:
            // Các loại tin nhắn khác (video, voice...) thì bỏ qua hoặc phản hồi nhẹ
            break;
        }
      } catch (error: any) {
        this.logger.error(`❌ Lỗi xử lý sự kiện tin nhắn Zalo: ${error.message}`);
      }
    });

    this.logger.log(`✅ Đã kích hoạt luồng Listener riêng cho Bot ID: ${botId}`);
  }
}
