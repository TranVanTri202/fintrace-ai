import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { MessageDirection } from '@prisma/client';
import OpenAI from 'openai';
import { TransactionService } from '../transaction/transaction.service';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly transactionService: TransactionService,
  ) {
    const apiKey = this.configService.get<string>('openai.apiKey');
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Lấy câu trả lời từ AI dựa trên ngữ cảnh 10 tin nhắn gần nhất và hỗ trợ công cụ (Tools)
   */
  async getChatResponse(botId: string, userId: string): Promise<string> {
    try {
      // 1. Lấy 10 tin nhắn gần nhất
      const history = await this.prisma.message.findMany({
        where: { botId, userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      const currentDay = days[new Date().getDay()];

      const messages: any[] = [
        {
          role: 'system',
          content: `Bạn là FinTrace AI - trợ lý tài chính thông minh cực kỳ thân thiện. 
          Hôm nay là ${currentDay}, ngày ${new Date().toLocaleDateString('vi-VN')}.
          
          HƯỚNG DẪN TRẢ LỜI:
          1. Với các câu hỏi bình thường (chào hỏi, hỏi ngày giờ, tán gẫu, hỏi về bản thân AI,...): Hãy trả lời một cách tự nhiên, hóm hỉnh và không cần dùng đến bất kỳ công cụ tra cứu chi tiêu nào.
          2. Với các câu hỏi liên quan đến thống kê/tra cứu chi tiêu: Hãy chủ động gọi công cụ (Tools) để lấy dữ liệu chính xác trước khi trả lời. 
          3. Nếu người dùng muốn tính tổng tiền theo khoảng thời gian nhưng chưa cung cấp ngày cụ thể: Hãy hỏi lại một cách lịch sự để họ cung cấp thông tin.`,
        },
      ];

      const sortedHistory = history.reverse();
      for (const msg of sortedHistory) {
        messages.push({
          role: msg.direction === MessageDirection.INCOMING ? 'user' : 'assistant',
          content: msg.content || '',
        });
      }

      // 2. Định nghĩa các công cụ (Tools)
      const tools: any[] = [
        {
          type: 'function',
          function: {
            name: 'get_highest_spending_day',
            description: 'Tìm ngày mà người dùng đã chi tiêu nhiều tiền nhất trong lịch sử.',
            parameters: { type: 'object', properties: {} },
          },
        },
        {
          type: 'function',
          function: {
            name: 'get_lowest_spending_day',
            description: 'Tìm ngày mà người dùng đã chi tiêu ít tiền nhất (nhưng phải > 0) trong lịch sử.',
            parameters: { type: 'object', properties: {} },
          },
        },
        {
          type: 'function',
          function: {
            name: 'get_total_spending_by_range',
            description: 'Tính tổng số tiền đã chi tiêu trong một khoảng thời gian cụ thể.',
            parameters: {
              type: 'object',
              properties: {
                startDate: { type: 'string', description: 'Ngày bắt đầu (định dạng YYYY-MM-DD)' },
                endDate: { type: 'string', description: 'Ngày kết thúc (định dạng YYYY-MM-DD)' },
              },
              required: ['startDate', 'endDate'],
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'get_transactions_by_date',
            description: 'Lấy danh sách các khoản chi tiêu chi tiết (vị trí, số tiền, danh mục) của một ngày cụ thể.',
            parameters: {
              type: 'object',
              properties: {
                date: { type: 'string', description: 'Ngày cần tra cứu (định dạng YYYY-MM-DD)' },
              },
              required: ['date'],
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'export_to_excel',
            description: 'Tạo và xuất báo cáo danh sách chi tiêu ra file Excel để người dùng tải về.',
            parameters: { type: 'object', properties: {} },
          },
        },
      ];

      // 3. Gọi OpenAI lần 1
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        tools: tools as any,
        tool_choice: 'auto',
      });

      const message = response.choices[0].message;

      // 4. Kiểm tra xem AI có muốn gọi Tool không
      if (message.tool_calls && message.tool_calls.length > 0) {
        const toolMessages = [...messages, message];

        for (const toolCall of message.tool_calls) {
          const tCall = toolCall as any;
          this.logger.log(`🤖 AI đang gọi tool: ${tCall.function.name}`);
          
          let resultString = '';

          if (tCall.function.name === 'get_highest_spending_day') {
            const data = await this.transactionService.getHighestSpendingDay(userId);
            resultString = data 
              ? `Ngày tiêu nhiều nhất là ${data.date.toLocaleDateString('vi-VN')} với tổng số tiền là ${data.totalAmount} VNĐ.`
              : 'Người dùng này chưa có dữ liệu chi tiêu nào.';
          } 
          else if (tCall.function.name === 'get_lowest_spending_day') {
            const data = await this.transactionService.getLowestSpendingDay(userId);
            resultString = data 
              ? `Ngày tiêu ít nhất là ${data.date.toLocaleDateString('vi-VN')} với tổng số tiền là ${data.totalAmount} VNĐ.`
              : 'Người dùng này chưa có dữ liệu chi tiêu nào.';
          }
          else if (tCall.function.name === 'get_total_spending_by_range') {
            const args = JSON.parse(tCall.function.arguments);
            const total = await this.transactionService.getTotalSpendingByRange(
              userId, 
              new Date(args.startDate), 
              new Date(args.endDate)
            );
            resultString = `Tổng chi tiêu từ ${args.startDate} đến ${args.endDate} là ${total} VNĐ.`;
          }
          else if (tCall.function.name === 'get_transactions_by_date') {
            const args = JSON.parse(tCall.function.arguments);
            const list = await this.transactionService.getTransactionsByDate(userId, new Date(args.date));
            if (list.length === 0) {
              resultString = `Không tìm thấy khoản chi tiêu nào trong ngày ${args.date}.`;
            } else {
              resultString = `Danh sách chi tiêu ngày ${args.date}:\n` + 
                list.map(t => `- ${t.vendor}: ${t.amount} VNĐ (${t.category}) vào lúc ${t.time}`).join('\n');
            }
          }
          else if (tCall.function.name === 'export_to_excel') {
            resultString = '[TRIGGER_EXPORT_EXCEL]';
          }

          toolMessages.push({
            tool_call_id: tCall.id,
            role: 'tool',
            name: tCall.function.name,
            content: resultString,
          });
        }

        // Gọi OpenAI lần 2 với kết quả của Tool
        const secondResponse = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            ...toolMessages,
            {
              role: 'system',
              content: 'Nếu có bất kỳ tool nào báo kết quả là [TRIGGER_EXPORT_EXCEL], hãy chèn chính xác chuỗi [TRIGGER_EXPORT_EXCEL] vào cuối câu trả lời của bạn để hệ thống biết cần gửi file đính kèm.'
            }
          ],
        });

        return secondResponse.choices[0].message.content || 'Tôi đã tìm thấy thông tin nhưng không thể diễn đạt lại được.';
      }

      return message.content || 'Tôi không hiểu ý bạn lắm, bạn nói rõ hơn được không?';
    } catch (error: any) {
      this.logger.error(`❌ Lỗi AiService: ${error.message}`, error.stack);
      return 'Hệ thống AI đang bận, thử lại sau nhé!';
    }
  }

  /**
   * Tạo câu trả lời xác nhận lưu chi tiêu một cách tự nhiên bằng AI
   */
  async generateTransactionConfirmation(data: any): Promise<string> {
    try {
      const prompt = `Bạn là FinTrace AI. Tôi vừa giúp người dùng lưu một khoản chi tiêu với thông tin sau:
      - Cửa hàng/Nội dung: ${data.vendor}
      - Số tiền: ${data.amount} VNĐ
      - Danh mục: ${data.category}
      
      Hãy viết một câu phản hồi ngắn (dưới 20 từ), thân thiện, hóm hỉnh để xác nhận đã lưu thành công. 
      Đừng dùng các định dạng máy móc như [Vendor] - [Amount]. 
      Hãy trả lời như một người trợ lý thật sự.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        temperature: 0.8,
      });

      return response.choices[0].message.content || `Đã lưu xong giúp bạn khoản ${data.amount} VNĐ rồi nhé!`;
    } catch (error) {
      this.logger.error('Lỗi khi tạo câu trả lời xác nhận AI', error);
      return `✅ Đã ghi nhận chi tiêu: ${data.vendor} - ${data.amount} VNĐ.`;
    }
  }
}
