import { Module } from '@nestjs/common';
import { BookingService } from './booking.service.js';
import { BookingController } from './booking.controller.js';
import { BookingProcessor } from './booking.processor.js';
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
