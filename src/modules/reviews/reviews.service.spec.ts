import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource, EntityManager } from 'typeorm';
import { ReviewsService } from './reviews.service';
import { ReviewsRepository } from './reviews.repository';
import { BookingsService } from '../bookings/bookings.service';
import { ToursService } from '../tours/tours.service';
import { TourDeparturesService } from '../tours/tour-departures.service';
import { BookingStatus } from '../bookings/entities/tour-booking.entity';
import { UserRole } from '../users/entities/user.entity';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let repo: { existsForBooking: jest.Mock; save: jest.Mock };
  let bookings: { findByReference: jest.Mock };

  const author = { id: 'u1', email: 'a@b.com', role: UserRole.TOURIST };

  beforeEach(async () => {
    repo = {
      existsForBooking: jest.fn().mockResolvedValue(false),
      save: jest.fn((r: unknown) =>
        Promise.resolve({ id: 'r1', ...(r as object) }),
      ),
    };
    bookings = { findByReference: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: ReviewsRepository, useValue: repo },
        { provide: BookingsService, useValue: bookings },
        { provide: ToursService, useValue: { applyRating: jest.fn() } },
        {
          provide: TourDeparturesService,
          useValue: { tourIdFor: jest.fn().mockResolvedValue('t1') },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: (cb: (m: EntityManager) => unknown) =>
              cb({} as EntityManager),
          },
        },
      ],
    }).compile();
    service = module.get(ReviewsService);
  });

  it('rejects a review when the booking is not COMPLETED', async () => {
    bookings.findByReference.mockResolvedValue({
      id: 'b1',
      touristId: 'u1',
      status: BookingStatus.CONFIRMED,
      departureId: 'd1',
    });
    await expect(
      service.create('TUR-2026-0007', author, { rating: 5, body: 'great' }),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects a second review for the same booking', async () => {
    bookings.findByReference.mockResolvedValue({
      id: 'b1',
      touristId: 'u1',
      status: BookingStatus.COMPLETED,
      departureId: 'd1',
    });
    repo.existsForBooking.mockResolvedValue(true);
    await expect(
      service.create('TUR-2026-0007', author, { rating: 5, body: 'great' }),
    ).rejects.toThrow(ConflictException);
  });

  it('creates a review for a completed booking', async () => {
    bookings.findByReference.mockResolvedValue({
      id: 'b1',
      touristId: 'u1',
      status: BookingStatus.COMPLETED,
      departureId: 'd1',
    });
    const review = await service.create('TUR-2026-0007', author, {
      rating: 5,
      body: 'great',
    });
    expect(review.rating).toBe(5);
    expect(review.tourId).toBe('t1');
  });
});
