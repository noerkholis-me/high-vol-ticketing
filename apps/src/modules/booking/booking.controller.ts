import { Controller, Get, Post, Body } from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@Controller('booking')
@ApiTags('Booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @ApiOperation({ summary: 'Create booking', description: 'Create booking' })
  @ApiBody({ type: CreateBookingDto, description: 'Request body' })
  @ApiResponse({ status: 201, description: 'Booking created successfully', type: CreateBookingDto })
  @ApiResponse({ status: 400, description: 'Seat already booked or invalid input' })
  @ApiResponse({ status: 201, description: 'Booking created' })
  @Post()
  create(@Body() dto: CreateBookingDto): Promise<any> {
    return this.bookingService.create(dto.userId, dto.seatId);
  }

  @Get()
  @ApiResponse({ status: 200, description: 'Available seats' })
  findAll(): Promise<any> {
    return this.bookingService.getAvailableSeats();
  }
}
