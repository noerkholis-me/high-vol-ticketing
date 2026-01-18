import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Booking } from './entities/booking.entity';
import { Seat } from '../../generated/prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../rbac/decorators/permission.decorator';
import { RbacGuard } from '../rbac/guards/rbac.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SuccessMessage } from '../../common/decorators/success-message.decorator';

@Controller('booking')
@ApiTags('Booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @ApiOperation({ summary: 'Create booking', description: 'Create booking' })
  @ApiResponse({ status: 201, description: 'Booking created successfully' })
  @ApiResponse({ status: 400, description: 'Seat already booked or invalid input' })
  @ApiResponse({ status: 201, description: 'Booking created' })
  @SuccessMessage('Booking created! Please confirm your payment within 15 minutes')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('booking:create:own')
  @Post()
  create(@CurrentUser('userId') userId: string, @Body() dto: CreateBookingDto): Promise<Booking> {
    return this.bookingService.create(userId, dto.seatId);
  }

  @ApiResponse({ status: 200, description: 'Available seats' })
  @Get()
  findAll(): Promise<Seat[]> {
    return this.bookingService.getAvailableSeats();
  }
}
