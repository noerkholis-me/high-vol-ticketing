import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ example: '05dfd97b-6e70-45d0-bf52-304825484300' })
  @IsString()
  seatId: string;
}
