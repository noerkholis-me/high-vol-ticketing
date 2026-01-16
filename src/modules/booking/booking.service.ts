import { BadRequestException, Injectable } from '@nestjs/common';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { PrismaService } from '../../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Seat } from '../../generated/prisma/client';
import { StatusSeat } from '../../generated/prisma/enums';
import { minutes } from '@nestjs/throttler';

@Injectable()
export class BookingService {
  constructor(
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
    @InjectQueue('ticket-cleanup') private readonly ticketQueue: Queue,
  ) {}

  async create(userId: string, seatId: string) {
    const redis = this.redisService.getOrThrow();
    const statusSeatKey = `status:seat:${seatId}`;
    const getStatusSeatKey = await redis.get(statusSeatKey);

    if (getStatusSeatKey === StatusSeat.RESERVED)
      throw new BadRequestException('Maaf, kursi sedang dalam proses booking!');
    if (getStatusSeatKey === StatusSeat.SOLD) throw new BadRequestException('Maaf, kursi sudah dipesan!');

    const lockKey = `lock:seat:${seatId}`;
    const isLocked = await redis.set(lockKey, userId, 'EX', 5, 'NX');
    if (!isLocked) throw new BadRequestException('Kursi ini sedang diproses orang lain. Coba lagi!');

    try {
      const seat = await this.prisma.seat.findUnique({
        where: { id: seatId },
        select: { version: true, status: true },
      });

      if (!seat || seat.status !== 'AVAILABLE') throw new BadRequestException('Maaf kursi ini sudah tidak tersedia');

      const result = await this.prisma.$transaction(async (tx) => {
        await tx.seat.update({
          where: {
            id: seatId,
            version: seat.version,
          },
          data: {
            status: 'RESERVED',
            version: { increment: 1 },
          },
        });

        const booking = await tx.booking.create({
          data: {
            userId,
            seatId,
            status: 'PENDING',
            expiresAt: new Date(Date.now() + minutes(15)),
          },
        });

        return booking;
      });

      await redis.del('seats:available');
      await redis.set(statusSeatKey, StatusSeat.RESERVED, 'EX', 15 * 60);
      await this.ticketQueue.add(
        'cleanup',
        { bookingId: result.id, seatId: seatId },
        { delay: minutes(15), removeOnComplete: true, attempts: 3 },
      );

      return result;
    } finally {
      await redis.del(lockKey);
    }
  }

  async getAvailableSeats(): Promise<Seat[]> {
    const redis = this.redisService.getOrThrow();
    const cacheKey = 'seats:available';

    const cachedSeats = await redis.get(cacheKey);

    if (cachedSeats) return JSON.parse(cachedSeats) as Seat[];

    const seats = await this.prisma.seat.findMany({ where: { status: 'AVAILABLE' }, take: 10 });

    await redis.set(cacheKey, JSON.stringify(seats));

    return seats;
  }
}
