import { Module } from '@nestjs/common';
import { ExpenseService } from './expense.service';
import { OcrModule } from '../ocr/ocr.module';
import { TransactionModule } from '../transaction/transaction.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    OcrModule,
    TransactionModule,
    UserModule,
  ],
  providers: [ExpenseService],
  exports: [ExpenseService],
})
export class ExpenseModule {}
