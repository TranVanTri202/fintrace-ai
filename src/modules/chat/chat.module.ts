import { Module, Global } from '@nestjs/common';
import { ChatService } from './chat.service';

@Global() // Đánh dấu Global để các BotModule khác có thể dùng chung ngay
@Module({
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
