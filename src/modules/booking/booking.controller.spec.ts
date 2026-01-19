import { Test, TestingModule } from '@nestjs/testing';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { getQueueToken } from '@nestjs/bullmq';
import { getToken } from '@willsoto/nestjs-prometheus';
import { createMock } from '@golevelup/ts-jest';
import { Counter } from 'prom-client';
import { Queue } from 'bullmq';
import { StatusBooking, StatusSeat } from '../../generated/prisma/enums';
import { Booking, Seat } from '../../generated/prisma/client';
import { Decimal } from '@prisma/client/runtime/client';

describe('BookingController', () => {
  let bookingService: jest.Mocked<BookingService>;
  let bookingController: BookingController;
  let redisMock: jest.Mocked<ReturnType<RedisService['getOrThrow']>>;

  beforeEach(async () => {
    redisMock = createMock<ReturnType<RedisService['getOrThrow']>>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingController],
      providers: [
        BookingController,
        {
          provide: BookingService,
          useValue: createMock<BookingService>(),
        },
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

    bookingService = module.get(BookingService);
    bookingController = module.get(BookingController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(bookingController).toBeDefined();
    expect(bookingService).toBeDefined();
  });

  describe('create', () => {
    it('should return booking', async () => {
      const result: Booking = {
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

      jest.spyOn(bookingService, 'create').mockResolvedValue(result);

      const response = await bookingController.create('user-1', { seatId: 'seat-1' });

      expect(bookingService.create).toHaveBeenCalledWith('user-1', 'seat-1');
      expect(response).toBe(result);
    });
  });

  describe('getAvailableSeats', () => {
    it('should return available seats', async () => {
      const mockSeat: Seat[] = [
        {
          id: 'seat-1',
          status: StatusSeat.AVAILABLE,
          number: 'A-1',
          price: Decimal(10000),
          eventId: 'event-1',
          version: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      bookingService.getAvailableSeats.mockResolvedValue(mockSeat);

      const response = await bookingController.findAll();

      expect(bookingService.getAvailableSeats).toHaveBeenCalled();
      expect(response).toBe(mockSeat);
    });
  });
});
