import { Module } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { BookingProcessor } from './booking.processor';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'ticket-cleanup',
    }),
  ],
  controllers: [BookingController],
  providers: [BookingService, BookingProcessor],
})
export class BookingModule {}
