import { Controller, Param, Post } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { ApiParam } from '@nestjs/swagger';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post(':bookingId/confirm')
  create(@Param('bookingId') bookingId: string) {
    return this.paymentService.confirmPayment(bookingId);
  }
}
