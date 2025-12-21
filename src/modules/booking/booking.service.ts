import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { UpdateBookingDto } from './dto/update-booking.dto.js';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class BookingService {
  constructor(
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async create(userId: string, seatId: string) {
    const redis = this.redisService.getOrThrow();
    const lockKey = `lock:seat:${seatId}`;

    const isLocked = await redis.set(lockKey, userId, 'EX', 10, 'NX');

    if (isLocked) throw new BadRequestException('Kursi ini sedang diproses orang lain. Coba lagi!');

    try {
      const seat = await this.prisma.seat.findUnique({ where: { id: seatId } });

      if (!seat || seat.status !== 'AVAILABLE') throw new BadRequestException('Maaf kursi ini sudah tidak tersedia');

      return await this.prisma.$transaction(async (tx) => {
        const updatedSeat = await tx.seat.update({ where: { id: seatId }, data: { status: 'RESERVED' } });
        const booking = await tx.booking.create({
          data: {
            userId,
            seatId,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          },
        });

        return { message: 'Kursi berhasil diamankan!', booking };
      });
    } finally {
      await redis.del(lockKey);
    }
  }

  findAll() {
    return `This action returns all booking`;
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
