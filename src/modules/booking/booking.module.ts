import { Module } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { BookingProcessor } from './booking.processor';
import { BullModule } from '@nestjs/bullmq';
import { makeCounterProvider } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'ticket-cleanup',
    }),
  ],
  controllers: [BookingController],
  providers: [
    BookingService,
    BookingProcessor,
    makeCounterProvider({
      name: 'bookings_pending_total',
      help: 'Total bookings pending',
    }),
    makeCounterProvider({
      name: 'bookings_expired_total',
      help: 'Total bookings expired',
    }),
  ],
})
export class BookingModule {}
