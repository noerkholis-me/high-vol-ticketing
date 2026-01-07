import { Controller, Param, Post } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post(':bookingId/confirm')
  @ApiOkResponse()
  create(@Param('bookingId') bookingId: string) {
    return this.paymentService.confirmPayment(bookingId);
  }
}
