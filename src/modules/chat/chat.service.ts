import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MessageDirection } from '@prisma/client';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lưu nhật ký tin nhắn giữa Bot và Người dùng
   */
  async saveMessage(params: {
    botId: string;
    userId: string;
    content?: string;
    msgType?: string;
    direction: MessageDirection;
    rawPayload?: any;
  }) {
    try {
      const { botId, userId, content, msgType, direction, rawPayload } = params;
      
      const message = await this.prisma.message.create({
        data: {
          botId,
          userId,
          content,
          msgType,
          direction,
          rawPayload: rawPayload as any,
        },
      });

      return message;
    } catch (error: any) {
      this.logger.error(`❌ Lỗi khi lưu tin nhắn vào DB: ${error.message}`);
      return null;
    }
  }
}
