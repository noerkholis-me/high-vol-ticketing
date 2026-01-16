import { Controller, Param, Post } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SuccessMessage } from '../../common/decorators/success-message.decorator';

@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post(':bookingId/confirm')
  @ApiOkResponse()
  @SuccessMessage('Success confirm payment')
  create(@Param('bookingId') bookingId: string) {
    return this.paymentService.confirmPayment(bookingId);
  }
}
