import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RbacGuard } from './modules/rbac/guards/rbac.guard';
import { Permissions } from './modules/rbac/decorators/permission.decorator';

@Controller()
@ApiTags('App')
export class AppController {
  @Get()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('event:create')
  @ApiResponse({})
  getHello(): string {
    return 'Hello World!';
  }
}
