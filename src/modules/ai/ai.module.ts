import { Module, Global } from '@nestjs/common';
import { AiService } from './ai.service';
import { TransactionModule } from '../transaction/transaction.module';

@Global()
@Module({
  imports: [TransactionModule],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
