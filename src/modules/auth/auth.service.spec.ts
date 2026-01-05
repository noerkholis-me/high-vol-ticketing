import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { getQueueToken } from '@nestjs/bullmq';
import { PrismaService } from '../../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: { signAsync: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: RedisService, useValue: { getOrThrow: () => ({ get: jest.fn(), set: jest.fn(), del: jest.fn() }) } },
        { provide: getQueueToken('email'), useValue: { add: jest.fn() } },
        { provide: PrismaService, useValue: { user: { findUnique: jest.fn(), create: jest.fn() } } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
