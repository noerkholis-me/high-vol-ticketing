import { BadRequestException, Injectable } from '@nestjs/common';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { PrismaService } from '../../prisma/prisma.service';
import { Counter } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';

@Injectable()
export class PaymentService {
  constructor(
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
    @InjectMetric('tickets_sold_total') private readonly ticketsSoldCounter: Counter,
  ) {}

  async confirmPayment(bookingId: string) {
    try {
      await this.prisma.$transaction(async (tx) => {
        const booking = await tx.booking.findUnique({ where: { id: bookingId }, include: { seat: true } });
        if (!booking || booking.status !== 'PENDING') {
          throw new BadRequestException('Booking tidak ditemukan atau sudah kadaluarsa');
        }

        await tx.booking.update({ where: { id: bookingId }, data: { status: 'CONFIRMED' } });
        await tx.seat.update({ where: { id: booking.seatId }, data: { status: 'SOLD' } });

        const redis = this.redisService.getOrThrow();
        const statusSeatKey = `status:seat:${booking.seatId}`;
        await redis.set(statusSeatKey, 'SOLD');
        this.ticketsSoldCounter.inc(1);
      });

      return { message: 'Pembayaran berhasil di konfirmasi' };
    } catch (error) {
      console.error('Transaction error:', error);
      throw error;
    }
  }
}
