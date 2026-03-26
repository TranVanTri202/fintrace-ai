import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { MessageDirection } from '@prisma/client';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const apiKey = this.configService.get<string>('openai.apiKey');
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Lấy câu trả lời từ AI dựa trên ngữ cảnh 10 tin nhắn gần nhất
   */
  async getChatResponse(botId: string, userId: string): Promise<string> {
    try {
      // 1. Lấy 10 tin nhắn gần nhất giữa bot và user này
      const history = await this.prisma.message.findMany({
        where: { botId, userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      // 2. Chuyển đổi sang định dạng của OpenAI (đảo ngược lại vì đang lấy desc)
      const messages: any[] = [
        {
          role: 'system',
          content: 'Bạn là FinTrace AI - trợ lý quản lý chi tiêu thông minh. Bạn thân thiện, hóm hỉnh và luôn sẵn lòng giúp khách hàng quản lý tài chính. Hãy trả lời ngắn gọn, súc tích.',
        },
      ];

      // Đảo ngược history để đúng thứ tự thời gian
      const sortedHistory = history.reverse();

      for (const msg of sortedHistory) {
        messages.push({
          role: msg.direction === MessageDirection.INCOMING ? 'user' : 'assistant',
          content: msg.content || '',
        });
      }

      // 3. Gọi OpenAI API
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 1000,
        temperature: 0.7,
      });

      const aiResponse = completion.choices[0]?.message?.content || 'Xin lỗi, tôi gặp trục trặc một chút khi suy nghĩ. Thử lại sau nhé!';
      
      return aiResponse;
    } catch (error: any) {
      this.logger.error(`❌ Lỗi khi gọi OpenAI Chat: ${error.message}`, error.stack);
      return 'Hệ thống AI đang bận, bạn vui lòng gửi lại sau nhé!';
    }
  }
}
