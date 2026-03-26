import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';

export interface ExtractedReceiptData {
  vendor: string;
  amount: number;
  due_date: string;
  category: 'FOOD_DRINK' | 'TRANSPORT' | 'SHOPPING' | 'BILLS' | 'HEALTH' | 'ENTERTAINMENT' | 'OTHERS';
  items: Array<{ name: string; price: number }>;
}

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private readonly openAiUrl = 'https://api.openai.com/v1/chat/completions';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async extractReceiptData(imageUrl: string): Promise<ExtractedReceiptData> {
    const apiKey = this.configService.get<string>('openai.apiKey');
    
    if (!apiKey) {
      throw new HttpException('OpenAI API Key is missing', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const payload = {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Bạn là một AI thông minh phân tích hóa đơn chuẩn xác. Bạn luôn trả dữ liệu dưới dạng JSON thuần túy."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Trích xuất hóa đơn này thành JSON theo cấu trúc sau:\n" +
                    "{ \"vendor\": \"Tên cửa hàng\", \"amount\": tổng_tiền_chỉ_lấy_số_float, \"due_date\": \"YYYY-MM-DD\", \"category\": \"[chọn 1 trong: FOOD_DRINK, TRANSPORT, SHOPPING, BILLS, HEALTH, ENTERTAINMENT, OTHERS]\", \"items\": [{\"name\": \"Tên món\", \"price\": giá_tiền}] }"
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      response_format: { type: "json_object" }
    };

    try {
      this.logger.log(`Call OpenAI cho URL: ${imageUrl}`);
      const response = await lastValueFrom(
        this.httpService.post(this.openAiUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
        })
      );

      const jsonContent = response.data.choices[0].message.content;
      return JSON.parse(jsonContent) as ExtractedReceiptData;

    } catch (error: any) {
      this.logger.error('Lỗi khi gọi GPT-4o-mini Vision', error?.response?.data || error.message);
      throw new HttpException('Failed to extract data from receipt', HttpStatus.BAD_GATEWAY);
    }
  }
}
