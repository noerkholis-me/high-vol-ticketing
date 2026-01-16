import { Controller, Get, Param, Post, UseGuards, Body } from '@nestjs/common';
import { EventService } from './event.service';
import {
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateEventDto } from './dto/create-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../rbac/guards/rbac.guard';
import { Permissions } from '../rbac/decorators/permission.decorator';
import { CreateSeatsDto } from './dto/create-seats.dto';
import { SuccessMessage } from '../../common/decorators/success-message.decorator';

@ApiTags('Event')
@Controller('event')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @ApiOperation({ summary: 'List all Event', description: 'List all available Event' })
  @ApiResponse({ status: 200, description: 'Success get available events' })
  @ApiResponse({ status: 404, description: 'There is not available event' })
  @SuccessMessage('Success get available events')
  @Get()
  getAvailableEvents() {
    return this.eventService.getAvailableEvents();
  }

  @ApiOperation({
    summary: 'Get detail event with all seats',
    description: 'Get detail of event with all available seats ',
  })
  @ApiOkResponse()
  @ApiNotFoundResponse()
  @SuccessMessage('Success get detail event')
  @Get(':eventId/seats')
  findOne(@Param('eventId') eventId: string) {
    return this.eventService.findOne(eventId);
  }

  @ApiOperation({
    summary: 'Create event bulk seats',
    description: 'Bulk create seats (misal generate 1000 seats otomatis berdasarkan kategori',
    tags: ['Event', 'Organizer Endpoint'],
  })
  @ApiOkResponse()
  @ApiNotFoundResponse()
  @SuccessMessage('Success create seats')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('event:create:own')
  @Post(':eventId/seats')
  async createSeats(
    @CurrentUser('userId') userId: string,
    @Param('eventId') eventId: string,
    @Body() dto: CreateSeatsDto,
  ) {
    return await this.eventService.createSeats(userId, eventId, dto);
  }

  @ApiOperation({
    summary: 'Create event by Organizer',
    description: 'Create event by Organizer',
    tags: ['Event', 'Organizer Endpoint'],
  })
  @ApiOkResponse()
  @ApiConflictResponse()
  @SuccessMessage('Success create event')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('event:create:own')
  @Post()
  create(@CurrentUser('userId') userId: string, @Body() dto: CreateEventDto) {
    return this.eventService.create(userId, dto);
  }
}
