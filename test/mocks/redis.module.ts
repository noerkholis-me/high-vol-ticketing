import { Global, Module } from '@nestjs/common';
import { RedisService } from '@liaoliaots/nestjs-redis';

@Global()
@Module({
  providers: [
    {
      provide: RedisService,
      useValue: { getOrThrow: () => ({}) },
    },
  ],
  exports: [RedisService],
})
export class MockRedisModule {}
