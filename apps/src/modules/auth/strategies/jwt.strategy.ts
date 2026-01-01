import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { JwtPayload, AuthenticatedUser } from '../../../common/types/auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private readonly configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // Extract from Authorization header (Bearer token) - primary method
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        // Extract from cookies - fallback method
        (request: Request): string | null => {
          const cookies = request.cookies as { accessToken?: string } | undefined;
          return cookies?.accessToken ?? null;
        },
      ]),
      secretOrKey: secret,
      ignoreExpiration: false,
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    if (!payload.sub || !payload.email) {
      this.logger.warn('Invalid JWT payload structure', payload);
      throw new UnauthorizedException('Invalid token payload');
    }

    const user: AuthenticatedUser = {
      userId: payload.sub,
      email: payload.email,
    };

    this.logger.debug(`User authenticated: ${user.email} (${user.userId})`);
    return user;
  }
}
