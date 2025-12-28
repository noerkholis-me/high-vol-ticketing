import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingService } from './booking.service';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { getQueueToken } from '@nestjs/bullmq';
import { BadRequestException } from '@nestjs/common';

describe('BookingService', () => {
  let service: BookingService;
  let prisma: jest.Mocked<PrismaService>;
  let redis: any;
  let queue: any;

  beforeEach(async () => {
    const mockRedis = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
    const mockPrisma = {
      seat: { findUnique: jest.fn(), update: jest.fn() },
      booking: { create: jest.fn() },
      $transaction: jest.fn((cb) => cb(mockPrisma)),
    };
    const mockQueue = { add: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: RedisService, useValue: { getOrThrow: () => mockRedis } },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: getQueueToken('ticket-cleanup'), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
    prisma = module.get(PrismaService);
    redis = mockRedis;
    queue = mockQueue;
  });

  it('it should be defined', () => {
    expect(service).toBeDefined();
  });

  it('Skenario Gatekeeper: harus throw BadRequestException jika status kursi sudah ada di Redis', async () => {
    redis.get.mockResolvedValue('BOOKED');

    const userId = 'user-123';
    const seatId = 'seat-abc';
    redis.get;
    await expect(service.create(userId, seatId)).rejects.toThrow(new BadRequestException('Maaf, kursi sudah dipesan!'));

    expect(prisma.seat.findUnique).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('Skenario Lock Gagal: harus throw error jika kursi sedang diproses orang lain', async () => {
    redis.get.mockResolvedValue(null);
    redis.set.mockResolvedValue(null);

    await expect(service.create('user-1', 'seat-1')).rejects.toThrow(
      new BadRequestException('Kursi ini sedang diproses orang lain. Coba lagi!'),
    );

    expect(redis.get).toHaveBeenCalled();
    expect(prisma.seat.findUnique).not.toHaveBeenCalled();
  });
});
