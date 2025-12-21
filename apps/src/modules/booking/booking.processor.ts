import { Processor, WorkerHost } from '@nestjs/bullmq';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Job } from 'bullmq';

@Processor('ticket-cleanup')
export class BookingProcessor extends WorkerHost {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<{ bookingId: string; seatId: string }>, token?: string): Promise<any> {
    const { bookingId, seatId } = job.data;

    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });

    if (booking && booking.status === 'PENDING') {
      console.log(`[CLEANUP] Booking ${bookingId} expired. Releasing seat ${seatId}...`);

      await this.prisma.$transaction([
        this.prisma.seat.update({ where: { id: seatId }, data: { status: 'AVAILABLE' } }),
        this.prisma.booking.update({ where: { id: bookingId }, data: { status: 'EXPIRED' } }),
      ]);
    }

    return {};
  }
}
