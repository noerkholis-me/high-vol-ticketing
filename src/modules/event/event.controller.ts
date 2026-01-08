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

@ApiTags('Event')
@Controller('event')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @ApiOperation({ summary: 'Get All Event', description: 'Create All Available Event' })
  @ApiResponse({ status: 200, description: 'Success get available events' })
  @ApiResponse({ status: 404, description: 'There is not available event' })
  @Get()
  getAvailableEvents() {
    return this.eventService.getAvailableEvents();
  }

  @ApiOperation({ summary: 'Get Event Detail With All Seats', description: 'Get Event Detail' })
  @ApiOkResponse()
  @ApiNotFoundResponse()
  @Get(':eventId')
  findOne(@Param('eventId') eventId: string) {
    return this.eventService.findOne(eventId);
  }

  @ApiOperation({
    summary: 'Create event by Organizer',
    description: 'Create event by Organizer',
    tags: ['Event', 'Organizer'],
  })
  @ApiOkResponse()
  @ApiConflictResponse()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('event:create:own')
  @Post()
  create(@CurrentUser('userId') userId: string, @Body() dto: CreateEventDto) {
    return this.eventService.create(userId, dto);
  }
}
