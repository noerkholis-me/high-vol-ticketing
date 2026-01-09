import { Body, Controller, Delete, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import type { Response } from 'express';
import { verifyEmailQuery } from './dto/verify-email.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Cookies } from './decorators/cookies.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { RbacGuard } from '../rbac/guards/rbac.guard';
import { AssignPermissionToRoleDto } from './dto/assign-permission-to-role.dto';
import { Permissions } from '../rbac/decorators/permission.decorator';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Register new user' })
  @ApiResponse({ description: 'login' })
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ description: 'login' })
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const {
      data: { accessToken, refreshToken },
    } = await this.authService.login(dto);

    response.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1 * 24 * 60 * 60 * 1000, // 1 day
    });

    response.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  @ApiOperation({ summary: 'Verify Email' })
  @ApiResponse({ description: 'verify email' })
  @ApiQuery({ name: 'token', required: true })
  @ApiQuery({ name: 'email', required: true })
  @Post('verify')
  verify(@Query() dto: verifyEmailQuery) {
    return this.authService.verifyEmail(dto.token, dto.email);
  }

  @ApiOperation({ summary: 'Refresh token' })
  @ApiResponse({ description: 'refresh token' })
  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  async refresh(@Cookies('refreshToken') refreshToken: string, @Res({ passthrough: true }) response: Response) {
    const { accessToken } = await this.authService.refresh(refreshToken);

    response.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1 * 24 * 60 * 60 * 1000, // 1 day
    });
    return {
      accessToken,
    };
  }

  @ApiOperation({ summary: 'Refresh token' })
  @ApiResponse({ description: 'refresh token' })
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @Cookies('accessToken') accessToken: string,
    @Cookies('refreshToken') refreshToken: string,
    @CurrentUser('userId') userId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { message } = await this.authService.logout({
      accessToken,
      refreshToken,
      userId,
    });

    response.clearCookie('accessToken');
    response.clearCookie('refreshToken');

    return {
      message,
    };
  }

  @ApiOperation({ summary: 'Assign permissions to role', tags: ['Admin'] })
  @ApiResponse({ description: 'assign permissions to role' })
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('role:assign')
  @Post('admin/roles/:roleId/permissions')
  async assignPermissionsToRole(@Param('roleId') roleId: string, @Body() dto: AssignPermissionToRoleDto) {
    return this.authService.assignPermissionsToRole(roleId, dto.permissionIds);
  }

  @ApiOperation({ summary: 'Remove permission from role', tags: ['Admin'] })
  @ApiResponse({ description: 'remove permission from role' })
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('role:permission:remove')
  @Delete('admin/roles/:roleId/permissions/:permissionId')
  async removePermissionFromRole(@Param('roleId') roleId: string, @Param('permissionId') permissionId: string) {
    return this.authService.removePermissionFromRole(roleId, permissionId);
  }

  @ApiOperation({ summary: 'Get role permissions', tags: ['Admin'] })
  @ApiResponse({ description: 'get role permissions' })
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('role:permission:read:all')
  @Get('admin/roles/:roleId/permissions')
  async getRolePermissions(@Param('roleId') roleId: string) {
    return this.authService.getRolePermissions(roleId);
  }
}
