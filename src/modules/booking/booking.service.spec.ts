import { Booking, Seat, StatusBooking, StatusSeat } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/client';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { getQueueToken } from '@nestjs/bullmq';
import { BookingService } from './booking.service';
import { Queue } from 'bullmq';
import { getToken } from '@willsoto/nestjs-prometheus';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Counter } from 'prom-client';

describe('BookingService', () => {
  let service: BookingService;
  let prismaMock: DeepMocked<PrismaService>;
  let redisMock: jest.Mocked<ReturnType<RedisService['getOrThrow']>>;
  let queueMock: jest.Mocked<Queue>;
  let bookingsPendingCounter: jest.Mocked<Counter>;

  beforeEach(async () => {
    redisMock = createMock<ReturnType<RedisService['getOrThrow']>>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        {
          provide: RedisService,
          useValue: { getOrThrow: () => redisMock },
        },
        {
          provide: PrismaService,
          useValue: createMock<PrismaService>(),
        },
        {
          provide: getQueueToken('ticket-cleanup'),
          useValue: createMock<Queue>(),
        },
        {
          provide: getToken('bookings_pending_total'),
          useValue: createMock<Counter>(),
        },
      ],
    }).compile();

    service = module.get(BookingService);
    prismaMock = module.get(PrismaService);
    queueMock = module.get(getQueueToken('ticket-cleanup'));
    bookingsPendingCounter = module.get(getToken('bookings_pending_total'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('Should be initialized', () => {
      expect(service).toBeInstanceOf(BookingService);
      expect(prismaMock).toBeDefined();
      expect(redisMock).toBeDefined();
      expect(queueMock).toBeDefined();
      expect(bookingsPendingCounter).toBeDefined();
    });
  });

  describe('create()', () => {
    it('Should be throw BadRequest if Seat already RESERVED', async () => {
      redisMock.get.mockResolvedValue(StatusSeat.RESERVED);

      await expect(service.create('user-1', 'seat-1')).rejects.toThrow(
        new BadRequestException('Maaf, kursi sedang dalam proses booking!'),
      );

      expect(redisMock.set).not.toHaveBeenCalled();
      expect(prismaMock.seat.findUnique).not.toHaveBeenCalled();
    });

    it('Should be throw BadRequest if Seat already SOLD', async () => {
      redisMock.get.mockResolvedValue(StatusSeat.SOLD);

      await expect(service.create('user-1', 'seat-1')).rejects.toThrow(
        new BadRequestException('Maaf, kursi sudah dipesan!'),
      );

      expect(redisMock.set).not.toHaveBeenCalled();
      expect(prismaMock.seat.findUnique).not.toHaveBeenCalled();
    });

    it('Should be throw BadRequest when Seat already proceed other user(fail locking)', async () => {
      redisMock.get.mockResolvedValue(null);
      redisMock.set.mockResolvedValue(null);

      await expect(service.create('user-1', 'seat-1')).rejects.toThrow(
        new BadRequestException('Kursi ini sedang diproses orang lain. Coba lagi!'),
      );

      expect(redisMock.get).toHaveBeenCalled();
      expect(redisMock.set).toHaveBeenCalled();
      expect(prismaMock.seat.findUnique).not.toHaveBeenCalled();
    });

    it('Should be throw BadRequest if Seat not Available', async () => {
      redisMock.get.mockResolvedValue(null);
      redisMock.set.mockResolvedValue('OK');

      prismaMock.seat.findUnique.mockResolvedValue({
        id: 'seat-1',
        status: StatusSeat.SOLD,
        number: 'A-1',
        price: Decimal(10000),
        eventId: 'event-1',
        version: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(service.create('user-1', 'seat-1')).rejects.toThrow(
        new BadRequestException('Maaf kursi ini sudah tidak tersedia'),
      );

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('Should be throw BadRequest if Seat not found', async () => {
      redisMock.get.mockResolvedValue(null);
      redisMock.set.mockResolvedValue('OK');

      prismaMock.seat.findUnique.mockResolvedValue(null);

      await expect(service.create('user-1', 'seat-1')).rejects.toThrow(
        new BadRequestException('Maaf kursi ini sudah tidak tersedia'),
      );

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('Should be succeeds, update DB, and enter cleanup queue', async () => {
      const mockSeat: Seat = {
        id: 'seat-1',
        status: 'AVAILABLE',
        number: 'A-1',
        price: Decimal(10000),
        eventId: 'event-1',
        version: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockBooking: Booking = {
        id: 'booking-1',
        status: StatusBooking.PENDING,
        userId: 'user-1',
        seatId: 'seat-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(),
        createdBy: 'user-1',
        updatedBy: 'user-1',
      };

      redisMock.get.mockResolvedValue(null);
      redisMock.set.mockResolvedValue('OK');

      prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock));

      prismaMock.seat.findUnique.mockResolvedValue(mockSeat);
      prismaMock.seat.update.mockResolvedValue({ ...mockSeat, status: 'RESERVED' });
      prismaMock.booking.create.mockResolvedValue(mockBooking);

      const result = await service.create('user-1', 'seat-1');

      expect(result).toEqual(mockBooking);
      expect(queueMock.add).toHaveBeenCalledWith(
        'cleanup',
        expect.objectContaining({ bookingId: mockBooking.id, seatId: mockSeat.id }),
        expect.any(Object),
      );
      expect(redisMock.del).toHaveBeenCalledWith('lock:seat:seat-1');
      expect(bookingsPendingCounter.inc).toHaveBeenCalledWith(1);
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

      redisMock.get.mockResolvedValue(JSON.stringify(cachedSeats));

      const result = await service.getAvailableSeats();

      expect(result).toEqual(cachedSeats);
      expect(prismaMock.seat.findMany).not.toHaveBeenCalled();
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
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      redisMock.get.mockResolvedValue(null);
      prismaMock.seat.findMany.mockResolvedValue(availableSeats);

      const result = await service.getAvailableSeats();

      expect(redisMock.set).toHaveBeenCalled();
      expect(result).toEqual(availableSeats);
    });
  });
});
