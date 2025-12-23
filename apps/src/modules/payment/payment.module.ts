import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service.js';
import { PaymentController } from './payment.controller.js';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Counter } from 'prom-client';
import { makeCounterProvider } from '@willsoto/nestjs-prometheus';

@Module({
  controllers: [PaymentController],
  providers: [
    makeCounterProvider({
      name: 'tickets_sold_total',
      help: 'Total number of tickets sold',
    }),
    PaymentService,
  ],
})
export class PaymentModule {}
