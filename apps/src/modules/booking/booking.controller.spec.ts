import { Test, TestingModule } from '@nestjs/testing';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { getQueueToken } from '@nestjs/bullmq';
import { PrismaService } from '../../prisma/prisma.service';

describe('BookingController', () => {
  let controller: BookingController;
  let service: BookingService;
  let prisma: jest.Mocked<PrismaService>;
  let mockRedis: any;
  let mockQueue: any;

  beforeEach(async () => {
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    mockQueue = { add: jest.fn() };

    const mockPrisma = {
      seat: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      booking: {
        create: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(mockPrisma)),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: RedisService, useValue: { getOrThrow: jest.fn().mockReturnValue(mockRedis) } },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: getQueueToken('ticket-cleanup'), useValue: mockQueue },
      ],
      controllers: [BookingController],
    }).compile();

    controller = module.get<BookingController>(BookingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
