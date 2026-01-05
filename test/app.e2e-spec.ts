import 'suppress-experimental-warnings';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { PrismaService } from '../src/prisma/prisma.service';
import request from 'supertest';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let redis: RedisService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    redis = moduleFixture.get<RedisService>(RedisService); // If using decorator

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await prisma.$disconnect(); // Close Prisma
    const redisService = redis.getOrThrow(); // Close Redis
    await redisService.quit();
    await app.close(); // Close Nest app
  });

  it('should return Hello World!', async () => {
    const response = await request(app.getHttpServer()).get('/').expect(200);
    expect(response.text).toBe('Hello World!');
  });
});
