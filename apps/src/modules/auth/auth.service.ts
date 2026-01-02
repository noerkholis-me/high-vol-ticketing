import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import { Queue } from 'bullmq';
import * as argon2 from 'argon2';

import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    @InjectQueue('email') private emailQueue: Queue,
  ) {}

  async register(dto: RegisterDto) {
    const { email, password } = dto;

    const existingUser = await this.prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      throw new ConflictException('Email sudah terdaftar');
    }

    const hashedPassword = await argon2.hash(password);
    const verificationToken = uuidv4();
    const verificationExpires = new Date(Date.now() + 60 * 60 * 1000);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        isActive: false,
        verificationToken,
        verificationExpires,
      },
    });

    await this.emailQueue.add('sendVerification', { userId: user.id, token: verificationToken, email: user.email });

    return { message: 'Registrasi berhasil, cek email untuk verifikasi' };
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

  async verifyEmail(token: string, email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) throw new NotFoundException('User tidak ditemukan');
    if (user.verificationToken !== token) throw new BadRequestException('Token invalid');
    if (user.verificationExpires && user.verificationExpires < new Date())
      throw new BadRequestException('Token expired');
    if (user.isActive) throw new BadRequestException('User sudah aktif');

    await this.prisma.user.update({
      where: { email },
      data: {
        isActive: true,
        verificationToken: null,
        verificationExpires: null,
      },
    });

    return {
      message: 'Email berhasil diverifikasi',
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
