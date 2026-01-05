import { Global, Module } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';

@Global()
@Module({
  providers: [
    {
      provide: PrismaService,
      useValue: {},
    },
  ],
  exports: [PrismaService],
})
export class MockPrismaModule {}
