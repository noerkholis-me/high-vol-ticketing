import { Test, TestingModule } from '@nestjs/testing';
import { BookingService } from './booking.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { BadRequestException } from '@nestjs/common';

describe('BookingService', () => {
  let service: BookingService;
  let prisma: PrismaService;
  let redis: any;

  beforeEach(async () => {
    const mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: PrismaService, useValue: { seat: { findUnique: jest.fn() }, $transaction: jest.fn() } },
        { provide: RedisService, useValue: { getOrThrow: () => mockRedis } },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
    prisma = module.get<PrismaService>(PrismaService);
    redis = mockRedis;
  });

  it('harus throw BadRequest jika kursi sudah SOLD di Redis (Gatekeeper)', async () => {
    redis.get.mockResolvedValue('SOLD');

    await expect(service.create('user-1', 'seat-1')).rejects.toThrow(BadRequestException);

    redis.get.mockResolvedValue('SOLD');
  });
});
