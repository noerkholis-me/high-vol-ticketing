import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Booking } from './entities/booking.entity';
import { Seat } from '../../generated/prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('booking')
@ApiTags('Booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @ApiOperation({ summary: 'Create booking', description: 'Create booking' })
  @ApiResponse({ status: 201, description: 'Booking created successfully', type: CreateBookingDto })
  @ApiResponse({ status: 400, description: 'Seat already booked or invalid input' })
  @ApiResponse({ status: 201, description: 'Booking created' })
  @Post()
  create(@Body() dto: CreateBookingDto): Promise<Booking> {
    return this.bookingService.create(dto.userId, dto.seatId);
  }

  @UseGuards(JwtAuthGuard)
  // @Permissions('event:create') // Uncomment and add RbacGuard to use permissions
  @ApiResponse({ status: 200, description: 'Available seats' })
  @Get()
  findAll(): Promise<Seat[]> {
    return this.bookingService.getAvailableSeats();
  }
}
