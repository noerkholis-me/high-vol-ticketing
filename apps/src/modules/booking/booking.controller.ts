import { Controller, Get, Post, Body } from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

@Controller('booking')
@ApiTags('Booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @ApiResponse({ status: 201, description: 'Booking created' })
  create(@Body() dto: CreateBookingDto): Promise<any> {
    return this.bookingService.create(dto.userId, dto.seatId);
  }

  @Get()
  @ApiResponse({ status: 200, description: 'Available seats' })
  findAll(): Promise<any> {
    return this.bookingService.getAvailableSeats();
  }
}
