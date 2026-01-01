import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const { email, password } = dto;

    const existingUser = await this.prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      throw new ConflictException('Email sudah terdaftar');
    }

    const hashedPassword = await argon2.hash(password);

    const user = await this.prisma.user.create({
      data: { email, passwordHash: hashedPassword },
    });

    const accessToken = await this.generateToken(user.id, user.email);
    const refreshToken = await this.generateRefreshToken(user.id, user.email);

    return {
      accessToken,
      refreshToken,
    };
  }

  async login(dto: LoginDto) {
    const { email, password } = dto;

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Email atau password salah');

    const isPasswordValid = await argon2.verify(user.passwordHash, password);
    if (!isPasswordValid) throw new UnauthorizedException('Email atau password salah');

    const accessToken = await this.generateToken(user.id, email);
    const refreshToken = await this.generateRefreshToken(user.id, email);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async generateToken(userId: string, email: string): Promise<string> {
    const payload = { sub: userId, email };

    return await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '15m',
    });
  }

  private async generateRefreshToken(userId: string, email: string): Promise<string> {
    const payload = { sub: userId, email };

    return await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '7d',
    });
  }
}
