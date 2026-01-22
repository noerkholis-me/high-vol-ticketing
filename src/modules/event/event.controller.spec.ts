import { Test, TestingModule } from '@nestjs/testing';
import { EventController } from './event.controller';
import { EventService } from './event.service';
import { MockRedisModule } from '../../../test/mocks/redis.module';
import { MockPrismaModule } from '../../../test/mocks/prisma.module';
import { createMock } from '@golevelup/ts-jest';
import { Decimal } from '../../generated/prisma/internal/prismaNamespace';

describe('EventController', () => {
  let eventController: EventController;
  let eventService: EventService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [MockRedisModule, MockPrismaModule],
      controllers: [EventController],
      providers: [
        {
          provide: EventService,
          useValue: createMock<EventService>(),
        },
      ],
    }).compile();

    eventController = module.get<EventController>(EventController);
    eventService = module.get<EventService>(EventService);
  });

  it('should be defined', () => {
    expect(eventController).toBeDefined();
  });

  describe('getAvailableEvents', () => {
    it('Should return Available Events with count seats', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          name: 'Event 1',
          description: 'Description 1',
          date: new Date(),
          location: 'Location 1',
          createdBy: 'User 1',
          updatedBy: 'User 1',
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: {
            seats: 10,
          },
        },
      ];

      jest.spyOn(eventService, 'getAvailableEvents').mockResolvedValue(mockEvents);

      const result = await eventController.getAvailableEvents();

      expect(result).toEqual(mockEvents);
    });
  });

  describe('findOne', () => {
    it('Should return Event with Seats by eventId', async () => {
      const mockData: Awaited<ReturnType<typeof eventService.findOne>> = {
        id: 'event-1',
        name: 'Event 1',
        description: 'Description 1',
        date: new Date(),
        location: 'Location 1',
        createdBy: 'User 1',
        updatedBy: 'User 1',
        createdAt: new Date(),
        updatedAt: new Date(),
        seats: [
          {
            version: 1,
            id: 'seat-1',
            eventId: 'event-1',
            createdAt: new Date(),
            updatedAt: new Date(),
            number: 'A1',
            price: new Decimal(500000),
            status: 'AVAILABLE',
          },
        ],
      };

      jest.spyOn(eventService, 'findOne').mockResolvedValue(mockData);

      const result = await eventController.findOne('event-1');

      expect(result).toEqual(mockData);
    });
  });
});

// https://docs.google.com/forms/d/e/1FAIpQLSepaScVVcknDIMF_-UpWi-95NbYwaqgM-iTx8ilJorGmiYvlw/viewform
