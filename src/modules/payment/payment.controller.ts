import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SuccessMessage } from '../../common/decorators/success-message.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../rbac/guards/rbac.guard';
import { Permissions } from '../rbac/decorators/permission.decorator';

@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @ApiOkResponse()
  @SuccessMessage('Success confirm payment')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('payment:confirm')
  @Post(':bookingId/confirm')
  create(@Param('bookingId') bookingId: string) {
    return this.paymentService.confirmPayment(bookingId);
  }
}
