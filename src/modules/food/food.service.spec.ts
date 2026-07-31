import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ReservationType } from '../reservations/entities/reservation.entity';
import { ReservationsService } from '../reservations/reservations.service';
import { Restaurant } from './entities/restaurant.entity';
import { FoodRepository } from './food.repository';
import { FoodService } from './food.service';

const restaurant = (over: Partial<Restaurant> = {}): Restaurant =>
  ({
    id: 'r1',
    slug: 'buka',
    name: 'Buka',
    cuisine: 'Ghanaian',
    priceTier: 2,
    description: 'x',
    lat: 5.56,
    lng: -0.2,
    images: [],
    dietary: [],
    openingHours: [{ day: 3, opens: '09:00', closes: '22:00' }],
    menu: [],
    ratingAvg: 4.5,
    ratingCount: 10,
    ...over,
  }) as Restaurant;

describe('FoodService', () => {
  let service: FoodService;
  let repo: Record<string, jest.Mock>;
  let reservations: { create: jest.Mock };

  beforeEach(async () => {
    repo = {
      search: jest.fn(),
      findBySlug: jest.fn(),
      findById: jest.fn(),
    };
    reservations = {
      create: jest.fn((i) =>
        Promise.resolve({ reference: 'TBL-2026-0001', ...i }),
      ),
    };
    const module = await Test.createTestingModule({
      providers: [
        FoodService,
        { provide: FoodRepository, useValue: repo },
        { provide: ReservationsService, useValue: reservations },
      ],
    }).compile();
    service = module.get(FoodService);
  });

  it('sorts by distance and includes distanceKm when a location is given', async () => {
    repo.search.mockResolvedValue([
      restaurant({ id: 'far', lat: 6.7, lng: -1.6 }),
      restaurant({ id: 'near', lat: 5.561, lng: -0.2 }),
    ]);
    const page = await service.search({
      lat: 5.56,
      lng: -0.2,
      page: 1,
      limit: 20,
    });
    expect(page.results[0].id).toBe('near');
    expect(page.results[0].distanceKm).toBeGreaterThanOrEqual(0);
  });

  it('creates a free, immediately-confirmed TABLE reservation', async () => {
    repo.findById.mockResolvedValue(restaurant());
    const r = await service.reserve('u1', 'r1', {
      at: new Date('2026-08-19T19:00:00Z'),
      partySize: 2,
    });
    expect(reservations.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        type: ReservationType.TABLE,
        totalMinor: 0,
        confirmImmediately: true,
      }),
    );
    expect(r.reference).toBe('TBL-2026-0001');
  });

  it('404s reserve for an unknown restaurant', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(
      service.reserve('u1', 'missing', {
        at: new Date(),
        partySize: 2,
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
