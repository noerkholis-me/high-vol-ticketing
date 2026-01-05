import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { makeCounterProvider } from '@willsoto/nestjs-prometheus';

@Module({
  controllers: [PaymentController],
  providers: [
    makeCounterProvider({
      name: 'tickets_sold_total',
      help: 'Total number of tickets sold',
    }),
    PaymentService,
  ],
})
export class PaymentModule {}
