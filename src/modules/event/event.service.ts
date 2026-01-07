import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEventDto) {
    const event = await this.prisma.event.create({
      data: { ...dto },
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

    return {
      message: 'Success get available events',
      data: results,
    };
  }

  async findOne(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        seats: true,
      },
    });

    if (!event) throw new NotFoundException('Event tidak ditemukan');

    return {
      data: event,
    };
  }
}
