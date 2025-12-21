import { PartialType } from '@nestjs/swagger';
import { CreateBookingDto } from './create-booking.dto.js';

export class UpdateBookingDto extends PartialType(CreateBookingDto) {}
