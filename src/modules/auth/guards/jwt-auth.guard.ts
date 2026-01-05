import { ExecutionContext, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthenticatedUser } from '../../../common/types/auth.types';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<TUser = AuthenticatedUser>(err: Error | null, user: AuthenticatedUser | false, info: unknown): TUser {
    if (err) {
      this.logger.warn(`Authentication error: ${err.message}`);
      throw err;
    }

    if (!user) {
      this.logger.warn('Authentication failed: No user found', { info });
      throw new UnauthorizedException('Authentication required');
    }

    this.logger.debug(`User authenticated: ${user.email}`);
    return user as TUser;
  }
}
