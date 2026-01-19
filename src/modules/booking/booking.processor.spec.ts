import { Test, TestingModule } from '@nestjs/testing';
import { BookingProcessor } from './booking.processor';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { getToken } from '@willsoto/nestjs-prometheus';
import { StatusBooking, StatusSeat } from '../../generated/prisma/enums';
import { Booking, Seat } from '../../generated/prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import { Counter } from 'prom-client';
import { Job } from 'bullmq';

describe('BookingProcessor', () => {
  let processor: BookingProcessor;
  let prismaMock: DeepMocked<PrismaService>;
  let redisMock: jest.Mocked<ReturnType<RedisService['getOrThrow']>>;
  let bookingsExpiredCounter: jest.Mocked<Counter>;

  beforeEach(async () => {
    prismaMock = createMock<PrismaService>();
    redisMock = createMock<ReturnType<RedisService['getOrThrow']>>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingProcessor,
        { provide: PrismaService, useValue: prismaMock },
        { provide: RedisService, useValue: { getOrThrow: () => redisMock } },
        { provide: getToken('bookings_expired_total'), useValue: createMock<Counter>() },
      ],
    }).compile();

    processor = module.get(BookingProcessor);
    bookingsExpiredCounter = module.get(getToken('bookings_expired_total'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createJob = (bookingId: string, seatId: string): Job<{ bookingId: string; seatId: string }> => {
    return {
      id: 'job-1',
      name: 'cleanup',
      data: { bookingId, seatId },
    } as Job<{ bookingId: string; seatId: string }>;
  };

  it('should do nothing when booking does not exist', async () => {
    prismaMock.booking.findUnique.mockResolvedValue(null);

    await processor.process(createJob('booking-1', 'seat-1'));

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(bookingsExpiredCounter.inc).not.toHaveBeenCalled();
    expect(redisMock.del).not.toHaveBeenCalled();
  });

  it('should do nothing when booking is not PENDING', async () => {
    const mockBooking: Booking = {
      id: 'booking-1',
      status: StatusBooking.CONFIRMED,
      userId: 'user-1',
      seatId: 'seat-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: new Date(),
      createdBy: 'user-1',
      updatedBy: 'user-1',
    };
    prismaMock.booking.findUnique.mockResolvedValue(mockBooking);

    await processor.process(createJob('booking-1', 'seat-1'));

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(bookingsExpiredCounter.inc).not.toHaveBeenCalled();
    expect(redisMock.del).not.toHaveBeenCalled();
  });

  it('should cleanup booking and seat when booking is PENDING', async () => {
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

    const mockSeat: Seat = {
      id: 'seat-1',
      status: StatusSeat.AVAILABLE,
      number: 'A-1',
      price: Decimal(10000),
      eventId: 'event-1',
      version: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.booking.findUnique.mockResolvedValue(mockBooking);

    prismaMock.$transaction.mockImplementation((cb) => cb(prismaMock));
    prismaMock.seat.update.mockResolvedValue(mockSeat);
    prismaMock.booking.update.mockResolvedValue({ ...mockBooking, status: StatusBooking.EXPIRED });

    await processor.process(createJob('booking-1', 'seat-1'));

    expect(prismaMock.booking.findUnique).toHaveBeenCalledWith({ where: { id: 'booking-1' } });
    expect(prismaMock.seat.update).toHaveBeenCalledWith({ where: { id: 'seat-1' }, data: { status: 'AVAILABLE' } });
    expect(prismaMock.booking.update).toHaveBeenCalledWith({ where: { id: 'booking-1' }, data: { status: 'EXPIRED' } });
    expect(bookingsExpiredCounter.inc).toHaveBeenCalledWith(1);
    expect(redisMock.del).toHaveBeenCalledWith(`status:seat:${mockSeat.id}`);
    expect(redisMock.del).toHaveBeenCalledWith('seats:available');
  });
});
