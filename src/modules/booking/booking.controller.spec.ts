import { Test, TestingModule } from '@nestjs/testing';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { getQueueToken } from '@nestjs/bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { Booking, Seat } from '../../generated/prisma/client';
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
describe('BookingController', () => {
  let controller: BookingController;
  let mockRedis: RedisMock;
  let queue: jest.Mocked<Queue>;

  beforeEach(async () => {
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    queue = { add: jest.fn() } as unknown as jest.Mocked<Queue>;

    const mockPrisma = {
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
          cb(mockPrisma),
        ) as PrismaMock['$transaction'],
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: RedisService, useValue: { getOrThrow: jest.fn().mockReturnValue(mockRedis) } },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: getQueueToken('ticket-cleanup'), useValue: queue },
        {
          provide: BookingService,
          useValue: {
            bookSeat: jest.fn(),
          },
        },
      ],
      controllers: [BookingController],
    }).compile();

    controller = module.get<BookingController>(BookingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
