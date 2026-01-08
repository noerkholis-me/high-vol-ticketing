import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EventCreateInput } from '../../../generated/prisma/models';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEventDto implements EventCreateInput {
  @ApiProperty({ description: 'Event name', example: 'Event 1' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Event date', example: '2026-01-01' })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiPropertyOptional({ description: 'Event description', example: 'Event description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Event location', example: 'Event location' })
  @IsString()
  @IsNotEmpty()
  location: string;
}
