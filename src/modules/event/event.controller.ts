import { Controller, Get, Param } from '@nestjs/common';
import { EventService } from './event.service';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

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
}
