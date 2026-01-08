import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';
import { CreateEventDto } from './create-event.dto';

export class CreateEventBulkSeatsDto extends CreateEventDto {
  @ApiProperty({ description: 'Seberapa banyak kursi akan dibuat', example: 10 })
  @IsNumber()
  number: number;
}
