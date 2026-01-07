import { Booking, Seat, StatusSeat } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/client';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { getQueueToken } from '@nestjs/bullmq';
import { BookingService } from './booking.service';
import { Queue } from 'bullmq';

type RedisMock = {
  get: jest.Mock<Promise<string | null>, [string]>;
  set: jest.Mock<Promise<string | null>, [string, string, ...unknown[]]>;
  del: jest.Mock<Promise<string | null>, [string]>;
};

type PrismaMock = {
  seat: {
    findUnique: jest.Mock<Promise<Seat | null>, [unknown]>;
    findMany: jest.Mock<Promise<Seat[]>, [unknown]>;
    update: jest.Mock<Promise<Seat>, [unknown]>;
  };
  booking: {
    create: jest.Mock<Promise<Booking>, [unknown]>;
  };
  $transaction: <T>(cb: (p: PrismaMock) => Promise<T>) => Promise<T>;
};

describe('BookingService', () => {
  let service: BookingService;
  let prisma: PrismaMock;
  let redis: RedisMock;
  let queue: jest.Mocked<Queue>;

  beforeEach(async () => {
    redis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    queue = { add: jest.fn() } as unknown as jest.Mocked<Queue>;

    prisma = {
      seat: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      booking: {
        create: jest.fn(),
      },
      $transaction: jest
        .fn()
        .mockImplementation(async (cb: (p: PrismaMock) => Promise<unknown>) =>
          cb(prisma),
        ) as PrismaMock['$transaction'],
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        {
          provide: RedisService,
          useValue: { getOrThrow: jest.fn().mockReturnValue(redis) },
        },
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: getQueueToken('ticket-cleanup'),
          useValue: queue,
        },
      ],
    }).compile();

    service = module.get(BookingService);
  });

  describe('create()', () => {
    it('Should be throw BadRequest if seat already SOLD', async () => {
      redis.get.mockResolvedValue(StatusSeat.SOLD);

      await expect(service.create('user-1', 'seat-1')).rejects.toThrow(
        new BadRequestException('Maaf, kursi sudah dipesan!'),
      );

      expect(redis.set).not.toHaveBeenCalled();
      expect(prisma.seat.findUnique).not.toHaveBeenCalled();
    });

    it('Should be throw BadRequest when seat already proceed other user(fail locking)', async () => {
      redis.get.mockResolvedValue(null);
      redis.set.mockResolvedValue(null);

      await expect(service.create('user-1', 'seat-1')).rejects.toThrow(
        new BadRequestException('Kursi ini sedang diproses orang lain. Coba lagi!'),
      );

      expect(redis.get).toHaveBeenCalled();
      expect(redis.set).toHaveBeenCalled();
      expect(prisma.seat.findUnique).not.toHaveBeenCalled();
    });

    it('Should be succeeds, update DB, and enter cleanup queue', async () => {
      const mockSeat: Seat = {
        id: 'seat-1',
        status: 'AVAILABLE',
        number: 'A-1',
        price: Decimal(10000),
        eventId: 'event-1',
        version: 0,
      };

      const mockBooking: Booking = {
        id: 'booking-1',
        userId: 'user-1',
        seatId: 'seat-1',
        status: 'PENDING',
        expiresAt: new Date(),
        createdAt: new Date(),
      };

      redis.get.mockResolvedValue(null);
      redis.set.mockResolvedValue('OK');
      prisma.seat.findUnique.mockResolvedValue(mockSeat);
      prisma.seat.update.mockResolvedValue({ ...mockSeat, status: 'RESERVED' });
      prisma.booking.create.mockResolvedValue(mockBooking);

      const result = await service.create('user-1', 'seat-1');

      expect(result.data).toEqual(mockBooking);
      expect(result.message).toContain('Booking berhasil! Segera lakukan pembayaran dalam 15 menit.');
      expect(queue.add).toHaveBeenCalledWith(
        'cleanup',
        expect.objectContaining({ bookingId: mockBooking.id, seatId: mockSeat.id }),
        expect.any(Object),
      );
      expect(redis.del).toHaveBeenCalledWith('lock:seat:seat-1');
    });
  });

  describe('getAvailableSeats()', () => {
    it('Should be return cache redis data', async () => {
      const cachedSeats = [
        {
          id: 'seat-1',
          eventId: 'event-1',
          number: 'A-1',
          price: '100000',
          status: 'AVAILABLE',
          version: 0,
        },
      ];

      redis.get.mockResolvedValue(JSON.stringify(cachedSeats));

      const result = await service.getAvailableSeats();

      expect(result).toEqual(cachedSeats);
      expect(prisma.seat.findMany).not.toHaveBeenCalled();
    });

    it('Should be return DB data', async () => {
      const availableSeats = [
        {
          id: 'seat-1',
          eventId: 'event-1',
          number: 'A-1',
          price: Decimal(100000),
          status: StatusSeat.AVAILABLE,
          version: 0,
        },
      ];

      redis.get.mockResolvedValue(null);
      prisma.seat.findMany.mockResolvedValue(availableSeats);

      const result = await service.getAvailableSeats();

      expect(redis.set).toHaveBeenCalled();
      expect(result).toEqual(availableSeats);
    });
  });
});
