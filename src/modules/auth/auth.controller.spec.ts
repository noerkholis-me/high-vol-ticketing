import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Seat } from '../../generated/prisma/client';
import { Booking } from '../booking/entities/booking.entity';

type PrismaMock = {
  seat: {
    findUnique: jest.Mock<Promise<Seat | null>, [unknown]>;
    findMany: jest.Mock<Promise<Seat[]>, [unknown]>;
    update: jest.Mock<Promise<Seat>, [unknown]>;
  };
  booking: {
    create: jest.Mock<Promise<Booking>, [unknown]>;
  };
  $transaction: <T>(cb: (p: PrismaMock) => Promise<T>) => Promise<T>;
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const mockPrisma = {
      seat: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      booking: {
        create: jest.fn(),
      },
      $transaction: jest
        .fn()
        .mockImplementation(async (cb: (p: PrismaMock) => Promise<unknown>) =>
          cb(mockPrisma),
        ) as PrismaMock['$transaction'],
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
            register: jest.fn(),
          },
        },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
