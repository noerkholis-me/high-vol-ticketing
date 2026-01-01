import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../../prisma/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/permission.decorator';
import { AuthenticatedUser } from '../../../common/types/auth.types';

interface RequestWithUser {
  user?: AuthenticatedUser;
}

@Injectable()
export class RbacGuard implements CanActivate {
  private readonly logger = new Logger(RbacGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no permissions required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      this.logger.debug('No permissions required, allowing access');
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request?.user;

    if (!user?.userId) {
      this.logger.warn('Permission check failed: User not authenticated');
      throw new ForbiddenException('User not authenticated');
    }

    this.logger.debug(`Checking permissions for user ${user.userId}: ${requiredPermissions.join(', ')}`);

    const roles = await this.prisma.userRole.findMany({
      where: { userId: user.userId },
      select: {
        role: {
          select: {
            permissions: {
              select: {
                permission: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const userPermissions = new Set<string>();

    for (const r of roles) {
      for (const rp of r.role.permissions) {
        userPermissions.add(rp.permission.name);
      }
    }

    const hasPermission = requiredPermissions.every((p) => userPermissions.has(p));

    if (!hasPermission) {
      this.logger.warn(
        `Permission denied for user ${user.userId}. Required: ${requiredPermissions.join(', ')}, Has: ${Array.from(userPermissions).join(', ') || 'none'}`,
      );
      throw new ForbiddenException('Insufficient permission');
    }

    this.logger.debug(`Permission granted for user ${user.userId}`);
    return true;
  }
}
