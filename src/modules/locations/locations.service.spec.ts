import { ConflictException, NotFoundException } from '@nestjs/common';
import { LocationQueryDto } from './dto/location-query.dto';
import { Location, LocationCategory } from './entities/location.entity';
import { LocationsRepository } from './locations.repository';
import { LocationsService } from './locations.service';

// Campus centre, roughly the Balme Library forecourt.
const ORIGIN = { lat: 5.6508, lng: -0.1869 };

const makeLocation = (over: Partial<Location>): Location => ({
  id: 'id-1',
  slug: 'balme-library',
  name: 'Balme Library',
  category: LocationCategory.ADMINISTRATION,
  description: 'The main university library.',
  lat: ORIGIN.lat,
  lng: ORIGIN.lng,
  photos: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...over,
});

const query = (over: Partial<LocationQueryDto> = {}): LocationQueryDto =>
  Object.assign(new LocationQueryDto(), { page: 1, limit: 20 }, over);

describe('LocationsService', () => {
  let repo: jest.Mocked<LocationsRepository>;
  let service: LocationsService;

  beforeEach(() => {
    repo = {
      search: jest.fn(),
      findBySlug: jest.fn(),
      findById: jest.fn(),
      findByIds: jest.fn(),
      existsBySlug: jest.fn(),
      create: jest.fn((input: Partial<Location>) => input as Location),
      save: jest.fn((l: Location) => Promise.resolve(l)),
      remove: jest.fn(),
    } as unknown as jest.Mocked<LocationsRepository>;
    service = new LocationsService(repo);
  });

  describe('search', () => {
    it('omits distanceKm when no origin is supplied', async () => {
      repo.search.mockResolvedValue([makeLocation({})]);

      const page = await service.search(query());

      expect(page.results[0].distanceKm).toBeUndefined();
      expect(page.total).toBe(1);
    });

    it('computes distanceKm and sorts nearest first when lat/lng are supplied', async () => {
      const near = makeLocation({
        id: 'near',
        slug: 'near',
        lat: 5.6512,
        lng: -0.1872,
      });
      const far = makeLocation({
        id: 'far',
        slug: 'far',
        lat: 5.6603,
        lng: -0.1955,
      });
      // Repository returns alphabetical order; the service must re-sort by distance.
      repo.search.mockResolvedValue([far, near]);

      const page = await service.search(query(ORIGIN));

      expect(page.results.map((r) => r.id)).toEqual(['near', 'far']);
      expect(page.results[0].distanceKm).toBeLessThan(
        page.results[1].distanceKm!,
      );
    });

    it('drops locations beyond radiusKm', async () => {
      const near = makeLocation({
        id: 'near',
        slug: 'near',
        lat: 5.6512,
        lng: -0.1872,
      });
      // ~10km north-east of campus — well outside any campus radius.
      const far = makeLocation({
        id: 'far',
        slug: 'far',
        lat: 5.74,
        lng: -0.12,
      });
      repo.search.mockResolvedValue([near, far]);

      const page = await service.search(query({ ...ORIGIN, radiusKm: 1 }));

      expect(page.results.map((r) => r.id)).toEqual(['near']);
      expect(page.total).toBe(1);
    });

    it('ignores radiusKm when no origin is supplied', async () => {
      repo.search.mockResolvedValue([
        makeLocation({}),
        makeLocation({ id: 'b', slug: 'b' }),
      ]);

      const page = await service.search(query({ radiusKm: 0.001 }));

      expect(page.total).toBe(2);
    });

    it('paginates the distance-filtered set', async () => {
      repo.search.mockResolvedValue(
        Array.from({ length: 5 }, (_, i) =>
          makeLocation({ id: `id-${i}`, slug: `slug-${i}` }),
        ),
      );

      const page = await service.search(query({ page: 2, limit: 2 }));

      expect(page.results).toHaveLength(2);
      expect(page.total).toBe(5);
      expect(page.totalPages).toBe(3);
      expect(page.pageSize).toBe(2);
    });
  });

  describe('findBySlug', () => {
    it('returns the location', async () => {
      repo.findBySlug.mockResolvedValue(makeLocation({}));
      await expect(service.findBySlug('balme-library')).resolves.toMatchObject({
        slug: 'balme-library',
      });
    });

    it('throws NotFoundException for an unknown slug', async () => {
      repo.findBySlug.mockResolvedValue(null);
      await expect(service.findBySlug('nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('rejects a duplicate slug', async () => {
      repo.existsBySlug.mockResolvedValue(true);
      await expect(
        service.create({
          slug: 'balme-library',
          name: 'Balme Library',
          category: LocationCategory.ADMINISTRATION,
          lat: ORIGIN.lat,
          lng: ORIGIN.lng,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('defaults photos to an empty array', async () => {
      repo.existsBySlug.mockResolvedValue(false);
      const created = await service.create({
        slug: 'great-hall',
        name: 'Great Hall',
        category: LocationCategory.ADMINISTRATION,
        lat: ORIGIN.lat,
        lng: ORIGIN.lng,
      });
      expect(created.photos).toEqual([]);
    });
  });

  describe('update', () => {
    it('allows a no-op slug rewrite on the same row', async () => {
      const existing = makeLocation({});
      repo.findById.mockResolvedValue(existing);
      repo.existsBySlug.mockResolvedValue(true);

      await expect(
        service.update('id-1', { slug: 'balme-library', name: 'Balme Lib' }),
      ).resolves.toMatchObject({ name: 'Balme Lib' });
    });

    it('rejects taking another location’s slug', async () => {
      repo.findById.mockResolvedValue(makeLocation({}));
      repo.existsBySlug.mockResolvedValue(true);

      await expect(
        service.update('id-1', { slug: 'great-hall' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
