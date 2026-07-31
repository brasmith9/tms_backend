import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { DataSource, EntityManager } from 'typeorm';
import { BookingsService } from './bookings.service';
import { BookingsRepository } from './bookings.repository';
import { ToursService } from '../tours/tours.service';
import { TourDeparturesService } from '../tours/tour-departures.service';
import { UsersService } from '../users/users.service';
import { ReservationsService } from '../reservations/reservations.service';
import type { AuthUser } from '../auth/auth-user.type';
import { UserRole } from '../users/entities/user.entity';
import { BookingResponseDto } from './dto/booking-response.dto';
import { BookingStatus, TourBooking } from './entities/tour-booking.entity';

describe('BookingsService', () => {
  let service: BookingsService;
  let repo: Record<string, jest.Mock>;
  let departures: Record<string, jest.Mock>;
  let tours: Record<string, jest.Mock>;
  let reservations: Record<string, jest.Mock>;

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
      itemsForDepartures: jest.fn().mockResolvedValue(new Map()),
    };
    departures = { lockAndGet: jest.fn() };
    tours = {
      findApprovedForDeparture: jest
        .fn()
        .mockResolvedValue({ priceMinor: 12000, currency: 'GHS' }),
    };
    reservations = {
      findMine: jest.fn().mockResolvedValue([]),
      findByReference: jest.fn(),
      cancel: jest.fn(),
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
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: UsersService, useValue: { addLoyaltyPoints: jest.fn() } },
        { provide: ReservationsService, useValue: reservations },
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

  describe('unified lookup by reference', () => {
    const tourist: AuthUser = { id: 'u1', role: UserRole.TOURIST } as AuthUser;

    it('returns a TOUR trip for a tour reference', async () => {
      repo.findByReference.mockResolvedValue({
        reference: 'TUR-2026-0007',
        touristId: 'u1',
        status: BookingStatus.CONFIRMED,
        departureId: 'd1',
        totalMinor: 24000,
        currency: 'GHS',
        createdAt: new Date(),
        seats: 2,
      });
      const trip = await service.findTripByReference('TUR-2026-0007', tourist);
      expect(trip.itemType).toBe('TOUR');
      expect(trip.reference).toBe('TUR-2026-0007');
      expect(reservations.findByReference).not.toHaveBeenCalled();
    });

    // The frontend integrated against BookingResponseDto; the unified trip
    // response must stay a superset of it for tours.
    it('keeps every field the tour BookingResponseDto exposed', async () => {
      const booking = {
        reference: 'TUR-2026-0007',
        touristId: 'u1',
        status: BookingStatus.CONFIRMED,
        departureId: 'd1',
        totalMinor: 24000,
        currency: 'GHS',
        createdAt: new Date('2026-07-31T20:25:34.382Z'),
        seats: 2,
      } as TourBooking;
      const item = {
        id: 't1',
        slug: 'kakum-canopy-walk',
        title: 'Kakum Canopy Walk',
        startsAt: '2026-08-25T08:30:00.000Z',
      };
      repo.findByReference.mockResolvedValue(booking);
      repo.itemsForDepartures.mockResolvedValue(new Map([['d1', item]]));

      const legacy = BookingResponseDto.from(booking, item);
      const trip = await service.findTripByReference('TUR-2026-0007', tourist);
      const asRecord = trip as unknown as Record<string, unknown>;

      for (const [key, value] of Object.entries(legacy)) {
        expect(asRecord[key]).toEqual(value);
      }
      expect(trip.itemType).toBe('TOUR');
    });

    it('falls back to reservations for a non-tour reference', async () => {
      repo.findByReference.mockResolvedValue(null);
      reservations.findByReference.mockResolvedValue({
        reference: 'STY-2026-0005',
        userId: 'u1',
        type: 'STAY',
        status: 'PENDING',
        totalMinor: 540000,
        currency: 'GHS',
        createdAt: new Date(),
        item: { title: 'Kempinski Hotel Gold Coast City' },
      });
      const trip = await service.findTripByReference('STY-2026-0005', tourist);
      expect(trip.itemType).toBe('STAY');
      expect(trip.total).toBe(5400);
    });

    it('cancels a reservation through the bookings route', async () => {
      repo.findByReference.mockResolvedValue(null);
      reservations.cancel.mockResolvedValue({
        reference: 'STY-2026-0005',
        userId: 'u1',
        type: 'STAY',
        status: 'CANCELLED',
        totalMinor: 540000,
        currency: 'GHS',
        createdAt: new Date(),
        item: { title: 'Kempinski Hotel Gold Coast City' },
      });
      const trip = await service.cancelTrip('STY-2026-0005', 'u1');
      expect(trip.itemType).toBe('STAY');
      expect(trip.status).toBe('CANCELLED');
      expect(reservations.cancel).toHaveBeenCalledWith('STY-2026-0005', 'u1');
    });
  });
});
