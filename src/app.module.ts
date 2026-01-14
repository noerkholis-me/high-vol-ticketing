import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { BookingModule } from './modules/booking/booking.module';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { BullModule } from '@nestjs/bullmq';
import { makeCounterProvider, makeHistogramProvider, PrometheusModule } from '@willsoto/nestjs-prometheus';
import { PaymentModule } from './modules/payment/payment.module';
import { AuthModule } from './modules/auth/auth.module';
import { EventModule } from './modules/event/event.module';
import { seconds, ThrottlerModule, ThrottlerStorageService } from '@nestjs/throttler';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { HttpMetricsInterceptor } from './common/interceptors/http-metrics.interceptor';

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
    }),
    RedisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        config: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get('REDIS_PORT', 6379),
        },
      }),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get('REDIS_PORT', 6379),
        },
      }),
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: seconds(60),
          limit: 100,
        },
      ],
      storage: new ThrottlerStorageService(),
    }),
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true,
      },
    }),
    PrismaModule,
    AuthModule,
    BookingModule,
    PaymentModule,
    EventModule,
  ],

  providers: [
    makeCounterProvider({
      name: 'http_requests_total',
      help: 'Total number of requests',
      labelNames: ['method', 'path', 'statusCode', 'route'],
    }),
    makeHistogramProvider({
      name: 'http_requests_duration_seconds',
      help: 'HTTP requests duration in seconds',
      labelNames: ['method', 'path', 'statusCode', 'route'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
    }),
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpMetricsInterceptor,
    },
  ],
})
export class AppModule {}
