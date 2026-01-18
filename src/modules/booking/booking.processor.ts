import { Processor, WorkerHost } from '@nestjs/bullmq';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { PrismaService } from '../../prisma/prisma.service';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter } from 'prom-client';

@Processor('ticket-cleanup')
export class BookingProcessor extends WorkerHost {
  private readonly logger = new Logger(BookingProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    @InjectMetric('bookings_expired_total') private readonly bookingsExpiredCounter: Counter,
  ) {
    super();
  }

  async process(job: Job<{ bookingId: string; seatId: string }>): Promise<void> {
    const { bookingId, seatId } = job.data;

    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });

    if (booking && booking.status === 'PENDING') {
      this.logger.log(`[CLEANUP] Booking ${bookingId} expired. Releasing seat ${seatId}...`);

      await this.prisma.$transaction(async (tx) => {
        await tx.seat.update({ where: { id: seatId }, data: { status: 'AVAILABLE' } });
        await tx.booking.update({ where: { id: bookingId }, data: { status: 'EXPIRED' } });
      });

      this.bookingsExpiredCounter.inc(1);
      const redis = this.redisService.getOrThrow();
      const statusSeatKey = `status:seat:${seatId}`;
      await redis.del(statusSeatKey);
      await redis.del('seats:available');
    }
  }
}
