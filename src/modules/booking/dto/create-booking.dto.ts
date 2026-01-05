import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ description: 'Id user', example: '11ccfb37-ae28-4e35-8df8-992c26cebff9' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Id kursi', example: '11ccfb37-ae28-4e35-8df8-992c26cebff9' })
  @IsString()
  seatId: string;
}
