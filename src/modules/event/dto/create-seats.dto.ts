import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class CreateSeatsDto {
  @ApiProperty({ description: 'Banyak kursi akan dibuat', example: 10 })
  @IsNumber()
  quantity: number;
}
