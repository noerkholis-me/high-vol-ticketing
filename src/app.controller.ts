import { Controller, Get } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

@Controller()
@ApiTags('App')
export class AppController {
  @Get()
  @ApiResponse({})
  getHello(): string {
    return 'Hello World!';
  }
}
