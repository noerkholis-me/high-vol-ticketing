import { Test, TestingModule } from '@nestjs/testing';
import { EventService } from './event.service';
import { MockRedisModule } from '../../../test/mocks/redis.module';
import { MockPrismaModule } from '../../../test/mocks/prisma.module';

describe('EventService', () => {
  let service: EventService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [MockRedisModule, MockPrismaModule],
      providers: [EventService],
    }).compile();

    service = module.get<EventService>(EventService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
