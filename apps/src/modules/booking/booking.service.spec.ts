import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingService } from './booking.service';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { getQueueToken } from '@nestjs/bullmq';
import { BadRequestException } from '@nestjs/common';

describe('BookingService', () => {
  let service: BookingService;
  let prisma: jest.Mocked<PrismaService>;
  let mockRedis: any;
  let mockQueue: any;

  beforeEach(async () => {
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    mockQueue = { add: jest.fn() };

    const mockPrisma = {
      seat: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      booking: {
        create: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(mockPrisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: RedisService, useValue: { getOrThrow: jest.fn().mockReturnValue(mockRedis) } },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: getQueueToken('ticket-cleanup'), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
    prisma = module.get(PrismaService);
  });

  describe('Create Booking', () => {
    it('it should be defined', () => {
      expect(service).toBeDefined();
    });

    it('Skenario Gatekeeper: harus throw BadRequestException jika status kursi sudah ada di Redis', async () => {
      (mockRedis.get as jest.Mock).mockResolvedValue('BOOKED');

      await expect(service.create('user-1', 'seat-1')).rejects.toThrow(
        new BadRequestException('Maaf, kursi sudah dipesan!'),
      );

      expect(prisma.seat.findUnique).not.toHaveBeenCalled();
      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    it('Skenario Lock Gagal: harus throw error jika kursi sedang diproses orang lain', async () => {
      (mockRedis.get as jest.Mock).mockResolvedValue(null);
      (mockRedis.set as jest.Mock).mockResolvedValue(null);

      await expect(service.create('user-1', 'seat-1')).rejects.toThrow(
        new BadRequestException('Kursi ini sedang diproses orang lain. Coba lagi!'),
      );

      expect(mockRedis.get).toHaveBeenCalled();
      expect(prisma.seat.findUnique).not.toHaveBeenCalled();
    });

    it('Skenario Sukses: harus berhasil booking, update DB, dan masuk antrean cleanup', async () => {
      const mockSeat = { id: 'seat-1', status: 'AVAILABLE' };
      const mockBooking = { id: 'booking-123', userId: 'user-1', seatId: 'seat-1' };

      (mockRedis.get as jest.Mock).mockResolvedValue(null);
      (mockRedis.set as jest.Mock).mockResolvedValue('OK');
      (prisma.seat.findUnique as jest.Mock).mockResolvedValue(mockSeat);
      (prisma.booking.create as jest.Mock).mockResolvedValue(mockBooking);

      const result = await service.create('user-1', 'seat-1');

      expect(result.message).toContain('Booking berhasil! Segera lakukan pembayaran dalam 15 menit.');
      expect(result.data).toEqual(mockBooking);

      expect(prisma.seat.update).toHaveBeenCalledWith({
        where: { id: 'seat-1' },
        data: { status: 'RESERVED' },
      });

      expect(mockQueue.add).toHaveBeenCalledWith(
        'cleanup',
        expect.objectContaining({ bookingId: 'booking-123' }),
        expect.any(Object),
      );
    });
  });

  describe('Get All Available Seats', () => {});
});
