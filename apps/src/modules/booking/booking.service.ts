import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { UpdateBookingDto } from './dto/update-booking.dto.js';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { PrismaService } from '../../prisma/prisma.service.js';
import { BookingProcessor } from './booking.processor.js';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class BookingService {
  constructor(
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
    @InjectQueue('ticket-cleanup') private readonly ticketQueue: Queue,
  ) {}

  async create(userId: string, seatId: string) {
    const redis = this.redisService.getOrThrow();
    const lockKey = `lock:seat:${seatId}`;

    const isLocked = await redis.set(lockKey, userId, 'PX', 10, 'NX');

    if (isLocked) throw new BadRequestException('Kursi ini sedang diproses orang lain. Coba lagi!');

    try {
      const seat = await this.prisma.seat.findUnique({ where: { id: seatId } });

      if (!seat) throw new BadRequestException('Maaf kursi ini sudah tidak tersedia');
      if (seat.status !== 'AVAILABLE') throw new BadRequestException('Maaf, kursi sudah dipesan.');

      const result = await this.prisma.$transaction(async (tx) => {
        await tx.seat.update({ where: { id: seatId }, data: { status: 'RESERVED' } });

        const booking = await tx.booking.create({
          data: {
            userId,
            seatId,
            status: 'PENDING',
            expiresAt: new Date(Date.now() + 2 * 60 * 1000),
          },
        });

        return booking;
      });

      await this.ticketQueue.add(
        'cleanup',
        { bookingId: result.id, seatId: seatId },
        { delay: 2 * 60 * 1000, removeOnComplete: true, attempts: 3 },
      );

      console.log('Mantap');
      return {
        message: 'Booking berhasil! Segera lakukan pembayaran dalam 15 menit.',
        data: result,
      };
    } catch (error) {
      // Jika ada error di luar BadRequest, kita log
      // console.error('Booking Error:', error);
      throw error;
    } finally {
      await redis.del(lockKey);
    }
  }

  async getAvailableSeats() {
    const redis = this.redisService.getOrThrow();
    const cacheKey = 'seats:available';

    const cachedSeats = await redis.get(cacheKey);

    if (cachedSeats) return JSON.parse(cachedSeats);

    const seats = await this.prisma.seat.findMany({ where: { status: 'AVAILABLE' }, take: 10 });

    await redis.set(cacheKey, JSON.stringify(seats), 'EX', 10);

    return seats;
  }

  findOne(id: number) {
    return `This action returns a #${id} booking`;
  }

  update(id: number, updateBookingDto: UpdateBookingDto) {
    return `This action updates a #${id} booking`;
  }

  remove(id: number) {
    return `This action removes a #${id} booking`;
  }
}
