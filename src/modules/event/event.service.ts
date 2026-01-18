import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEventBulkSeatsDto } from './dto/create-event-bulk-seats.dto';
import { SeatCreateManyEventInput, SeatCreateManyInput } from '../../generated/prisma/models';
import { CreateSeatsDto } from './dto/create-seats.dto';
import { RedisService } from '@liaoliaots/nestjs-redis';

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  // TODO: Refine event schema to add userId to track who create
  async create(userId: string, dto: CreateEventDto) {
    const event = await this.prisma.event.create({
      data: {
        ...dto,
        date: new Date(dto.date),
        createdBy: userId,
      },
    });

    return event;
  }

  async getAvailableEvents() {
    const results = await this.prisma.event.findMany({
      where: {
        date: {
          gte: new Date(),
        },
      },
      include: {
        _count: {
          select: {
            seats: {
              where: {
                status: 'AVAILABLE',
              },
            },
          },
        },
      },
    });

    if (results.length === 0) throw new NotFoundException('Events tidak ditemukan');

    return results;
  }

  async findOne(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        seats: {
          where: {
            status: 'AVAILABLE',
          },
          take: 10,
        },
      },
    });

    if (!event) throw new NotFoundException('Event tidak ditemukan');

    return event;
  }

  async createEventBulkSeats(userId: string, dto: CreateEventBulkSeatsDto) {
    const seats: SeatCreateManyEventInput[] = [];
    for (let i = 0; i < dto.number; i++) {
      seats.push({
        number: `A${i}`,
        price: 500000,
        status: 'AVAILABLE',
      });
    }

    const createdEventBulkSeats = await this.prisma.event.create({
      data: {
        name: dto.name,
        date: new Date(dto.date),
        description: dto.description,
        location: dto.location,
        seats: {
          createMany: {
            data: seats,
            skipDuplicates: true,
          },
        },
      },
      include: { _count: { select: { seats: true } } },
    });

    return createdEventBulkSeats;
  }

  async createSeats(userId: string, eventId: string, dto: CreateSeatsDto) {
    const redis = this.redisService.getOrThrow();
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event tidak ditemukan');

    const seats: SeatCreateManyInput[] = [];
    for (let i = 0; i < dto.quantity; i++) {
      seats.push({
        eventId: eventId,
        number: `A${i}`,
        price: 500000,
        status: 'AVAILABLE',
      });
    }

    const createdSeats = await this.prisma.seat.createMany({
      data: seats,
      skipDuplicates: true,
    });

    await redis.del('seats:available');

    return createdSeats;
  }
}
