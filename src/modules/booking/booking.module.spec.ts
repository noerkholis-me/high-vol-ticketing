import { Test, TestingModule } from '@nestjs/testing';
import { BookingModule } from './booking.module';
import { BookingService } from './booking.service';
import { getQueueToken } from '@nestjs/bullmq';

import { MockRedisModule } from '../../../test/mocks/redis.module';
import { MockPrismaModule } from '../../../test/mocks/prisma.module';

describe('BookingModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [BookingModule, MockRedisModule, MockPrismaModule],
    })
      .overrideProvider(getQueueToken('ticket-cleanup'))
      .useValue({})
      .compile();
  });

  it('BookingService should be resolved', () => {
    expect(module.get(BookingService)).toBeDefined();
  });
});
