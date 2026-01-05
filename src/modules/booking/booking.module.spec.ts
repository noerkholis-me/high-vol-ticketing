import { Test, TestingModule } from '@nestjs/testing';
import { BookingModule } from './booking.module';
import { BookingService } from './booking.service';
import { BookingProcessor } from './booking.processor';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { getQueueToken } from '@nestjs/bullmq';

describe('BookingModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [BookingModule],
    })
      // external dependencies
      .overrideProvider(RedisService)
      .useValue({ getOrThrow: () => ({}) })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(getQueueToken('ticket-cleanup'))
      .useValue({})
      .overrideProvider(BookingProcessor)
      .useValue({})
      .compile();
  });

  it('BookingService should be resolved', () => {
    expect(module.get(BookingService)).toBeDefined();
  });
});
