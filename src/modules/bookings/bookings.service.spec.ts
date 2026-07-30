import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { DataSource, EntityManager } from 'typeorm';
import { BookingsService } from './bookings.service';
import { BookingsRepository } from './bookings.repository';
import { ToursService } from '../tours/tours.service';
import { TourDeparturesService } from '../tours/tour-departures.service';
import { BookingStatus } from './entities/tour-booking.entity';

describe('BookingsService', () => {
  let service: BookingsService;
  let repo: Record<string, jest.Mock>;
  let departures: Record<string, jest.Mock>;
  let tours: Record<string, jest.Mock>;

  const fakeManager = {} as EntityManager;

  beforeEach(async () => {
    repo = {
      seatsConsumed: jest.fn(),
      countForYear: jest.fn().mockResolvedValue(6),
      create: jest.fn((b: Record<string, unknown>) => b),
      save: jest.fn((b: Record<string, unknown>) =>
        Promise.resolve({ id: 'b1', ...b }),
      ),
      findByReference: jest.fn(),
    };
    departures = { lockAndGet: jest.fn() };
    tours = {
      findApprovedForDeparture: jest
        .fn()
        .mockResolvedValue({ priceMinor: 12000, currency: 'GHS' }),
    };
    const dataSource = {
      transaction: (cb: (m: EntityManager) => unknown) => cb(fakeManager),
    };
    const module = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: BookingsRepository, useValue: repo },
        { provide: TourDeparturesService, useValue: departures },
        { provide: ToursService, useValue: tours },
        {
          provide: ConfigService,
          useValue: {
            get: () => ({ seatHoldMinutes: 15, cancellationWindowHours: 48 }),
          },
        },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();
    service = module.get(BookingsService);
  });

  it('creates a PENDING booking priced from the tour, with a reference', async () => {
    departures.lockAndGet.mockResolvedValue({
      id: 'd1',
      tourId: 't1',
      capacity: 10,
      departsAt: new Date(Date.now() + 1e9),
    });
    repo.seatsConsumed.mockResolvedValue(0);
    const booking = await service.create('u1', {
      departureId: 'd1',
      seats: 2,
    });
    expect(booking.status).toBe(BookingStatus.PENDING);
    expect(booking.totalMinor).toBe(24000);
    expect(booking.reference).toBe('TUR-2026-0007');
  });

  it('rejects a booking that would exceed remaining capacity with 409', async () => {
    departures.lockAndGet.mockResolvedValue({
      id: 'd1',
      tourId: 't1',
      capacity: 10,
      departsAt: new Date(Date.now() + 1e9),
    });
    repo.seatsConsumed.mockResolvedValue(9);
    await expect(
      service.create('u1', { departureId: 'd1', seats: 2 }),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects cancellation inside the window with 409', async () => {
    repo.findByReference.mockResolvedValue({
      reference: 'TUR-2026-0007',
      touristId: 'u1',
      status: BookingStatus.CONFIRMED,
      departureId: 'd1',
    });
    departures.lockAndGet.mockResolvedValue({
      id: 'd1',
      departsAt: new Date(Date.now() + 60 * 60 * 1000), // 1h away, inside 48h
    });
    await expect(service.cancel('TUR-2026-0007', 'u1')).rejects.toThrow(
      ConflictException,
    );
  });

  it('cancels when outside the window', async () => {
    repo.findByReference.mockResolvedValue({
      reference: 'TUR-2026-0007',
      touristId: 'u1',
      status: BookingStatus.CONFIRMED,
      departureId: 'd1',
    });
    departures.lockAndGet.mockResolvedValue({
      id: 'd1',
      departsAt: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72h away
    });
    const result = await service.cancel('TUR-2026-0007', 'u1');
    expect(result.status).toBe(BookingStatus.CANCELLED);
  });
});
