import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ReservationType } from '../reservations/entities/reservation.entity';
import type { EntityManager } from 'typeorm';
import { LocationsRepository } from '../locations/locations.repository';
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
    contactConsent: false,
    ...over,
  }) as Restaurant;

const CONTACT = {
  phone: '+233201234567',
  whatsapp: '+233201234567',
  email: 'orders@example.gh',
};

describe('FoodService', () => {
  let service: FoodService;
  let repo: Record<string, jest.Mock>;
  let reservations: { create: jest.Mock };
  let locations: Record<string, jest.Mock>;

  beforeEach(async () => {
    repo = {
      search: jest.fn(),
      findBySlug: jest.fn(),
      findById: jest.fn(),
      existsBySlug: jest.fn().mockResolvedValue(false),
      create: jest.fn((input: Partial<Restaurant>) => input as Restaurant),
      save: jest.fn((r: Restaurant) => Promise.resolve(r)),
    };
    reservations = {
      create: jest.fn((i) =>
        Promise.resolve({ reference: 'TBL-2026-0001', ...i }),
      ),
    };
    locations = {
      findById: jest.fn().mockResolvedValue(null),
      findByIds: jest.fn().mockResolvedValue([]),
    };
    const module = await Test.createTestingModule({
      providers: [
        FoodService,
        { provide: FoodRepository, useValue: repo },
        { provide: ReservationsService, useValue: reservations },
        { provide: LocationsRepository, useValue: locations },
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

  describe('contact consent gate', () => {
    it('publishes contact details when the vendor consented', async () => {
      repo.findBySlug.mockResolvedValue(
        restaurant({ contactConsent: true, ...CONTACT }),
      );

      const dto = await service.findBySlug('buka');

      expect(dto.contactConsent).toBe(true);
      expect(dto.phone).toBe(CONTACT.phone);
      expect(dto.whatsapp).toBe(CONTACT.whatsapp);
      expect(dto.email).toBe(CONTACT.email);
    });

    it('omits stored contact details when the vendor did not consent', async () => {
      // The row carries contacts; consent is the only thing withholding them.
      repo.findBySlug.mockResolvedValue(
        restaurant({ contactConsent: false, ...CONTACT }),
      );

      const dto = await service.findBySlug('buka');

      expect(dto.contactConsent).toBe(false);
      expect(dto.phone).toBeUndefined();
      expect(dto.whatsapp).toBeUndefined();
      expect(dto.email).toBeUndefined();
      expect(JSON.stringify(dto)).not.toContain(CONTACT.phone);
    });

    it('applies the gate on list results too', async () => {
      repo.search.mockResolvedValue([
        restaurant({ id: 'a', contactConsent: true, ...CONTACT }),
        restaurant({ id: 'b', contactConsent: false, ...CONTACT }),
      ]);

      const page = await service.search({ page: 1, limit: 20 });

      expect(page.results[0].phone).toBe(CONTACT.phone);
      expect(page.results[1].phone).toBeUndefined();
    });
  });

  describe('campus landmark', () => {
    it('hydrates nearestLocation from the referenced location', async () => {
      locations.findByIds.mockResolvedValue([
        { id: 'loc1', slug: 'commonwealth-hall', name: 'Commonwealth Hall' },
      ]);
      repo.findBySlug.mockResolvedValue(
        restaurant({ nearestLocationId: 'loc1' }),
      );

      const dto = await service.findBySlug('buka');

      expect(dto.nearestLocation).toEqual({
        id: 'loc1',
        slug: 'commonwealth-hall',
        name: 'Commonwealth Hall',
      });
    });

    it('leaves nearestLocation undefined when the joint has no landmark', async () => {
      repo.findBySlug.mockResolvedValue(restaurant());

      const dto = await service.findBySlug('buka');

      expect(dto.nearestLocation).toBeUndefined();
      expect(locations.findByIds).toHaveBeenCalledWith([]);
    });
  });

  describe('rating aggregate', () => {
    const managerFor = (r: Restaurant) => {
      const saved: Restaurant[] = [];
      return {
        manager: {
          getRepository: () => ({
            findOneOrFail: () => Promise.resolve(r),
            save: (x: Restaurant) => {
              saved.push(x);
              return Promise.resolve(x);
            },
          }),
        } as unknown as EntityManager,
        saved,
      };
    };

    it('rounds the running average to 2dp rather than leaking a long float', async () => {
      // 4.5 over 214 ratings plus one 5 gives 4.502325581395349 raw.
      const r = restaurant({ ratingAvg: 4.5, ratingCount: 214 });
      const { manager } = managerFor(r);

      await service.applyRating('r1', 5, manager);

      expect(r.ratingCount).toBe(215);
      expect(r.ratingAvg).toBe(4.5);
      expect(String(r.ratingAvg)).not.toMatch(/\d{6}/);
    });

    it('backs a withdrawn rating out without erasing unrowed history', async () => {
      // The seeded 214 ratings have no review row behind them; moderating the
      // one real review must not reset the joint to zero.
      const r = restaurant({ ratingAvg: 4.5, ratingCount: 215 });
      const { manager } = managerFor(r);

      await service.withdrawRating('r1', 5, manager);

      expect(r.ratingCount).toBe(214);
      expect(r.ratingAvg).toBe(4.5);
    });

    it('zeroes cleanly when the last rating is withdrawn', async () => {
      const r = restaurant({ ratingAvg: 5, ratingCount: 1 });
      const { manager } = managerFor(r);

      await service.withdrawRating('r1', 5, manager);

      expect(r).toMatchObject({ ratingCount: 0, ratingAvg: 0 });
    });

    it('never drives the count below zero', async () => {
      const r = restaurant({ ratingAvg: 0, ratingCount: 0 });
      const { manager } = managerFor(r);

      await service.withdrawRating('r1', 4, manager);

      expect(r).toMatchObject({ ratingCount: 0, ratingAvg: 0 });
    });

    it('round-trips: applying then withdrawing restores the original', async () => {
      const r = restaurant({ ratingAvg: 4.32, ratingCount: 97 });
      const { manager } = managerFor(r);

      await service.applyRating('r1', 2, manager);
      await service.withdrawRating('r1', 2, manager);

      expect(r.ratingCount).toBe(97);
      expect(r.ratingAvg).toBeCloseTo(4.32, 2);
    });
  });

  describe('vendor write path', () => {
    const createDto = {
      name: 'Tyme Out',
      cuisine: 'Ghanaian',
      priceTier: 2,
      description: 'x',
      lat: 5.65,
      lng: -0.187,
      phone: CONTACT.phone,
      contactConsent: true,
    };

    it('stamps the caller as owner and derives a slug from the name', async () => {
      const created = await service.create('vendor-1', createDto);

      expect(created.slug).toMatch(/^tyme-out-[0-9a-f]{6}$/);
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ ownerId: 'vendor-1' }),
      );
    });

    it('404s when the referenced campus location does not exist', async () => {
      locations.findById.mockResolvedValue(null);

      await expect(
        service.create('vendor-1', {
          ...createDto,
          nearestLocationId: '11111111-1111-1111-1111-111111111111',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('converts menu prices from cedis to pesewas on replace', async () => {
      repo.findById.mockResolvedValue(restaurant());

      const menu = await service.replaceMenu('r1', {
        sections: [
          {
            category: 'Mains',
            items: [
              { name: 'Jollof', price: 35.5, photoUrl: 'https://x.test/j.jpg' },
            ],
          },
        ],
      });

      expect(menu[0].items[0].priceMinor).toBe(3550);
      expect(menu[0].items[0].photoUrl).toBe('https://x.test/j.jpg');
    });

    it('resolves the owner for the ownership guard', async () => {
      repo.findById.mockResolvedValue(restaurant({ ownerId: 'vendor-1' }));
      await expect(service.ownerIdFor('r1')).resolves.toBe('vendor-1');
    });

    it('resolves a null owner for an editorially-seeded restaurant', async () => {
      repo.findById.mockResolvedValue(restaurant());
      await expect(service.ownerIdFor('r1')).resolves.toBeNull();
    });
  });
});
