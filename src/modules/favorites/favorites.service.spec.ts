import { ConflictException, NotFoundException } from '@nestjs/common';
import { QueryFailedError, Repository } from 'typeorm';
import { Destination } from '../destinations/entities/destination.entity';
import { Restaurant } from '../food/entities/restaurant.entity';
import { Stay } from '../stays/entities/stay.entity';
import { Tour } from '../tours/entities/tour.entity';
import { Favorite, FavoriteType } from './entities/favorite.entity';
import { FavoritesService } from './favorites.service';

const repoMock = () =>
  ({
    create: jest.fn((x: unknown) => x),
    save: jest.fn((x: Favorite) => Promise.resolve({ id: 'f1', ...x })),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    remove: jest.fn(),
  }) as unknown as jest.Mocked<Repository<Favorite>>;

describe('FavoritesService', () => {
  let service: FavoritesService;
  let favorites: jest.Mocked<Repository<Favorite>>;
  let tours: { findOne: jest.Mock };
  let stays: { findOne: jest.Mock };
  let restaurants: { findOne: jest.Mock };
  let destinations: { findOne: jest.Mock };

  beforeEach(() => {
    favorites = repoMock();
    tours = { findOne: jest.fn() };
    stays = { findOne: jest.fn() };
    restaurants = { findOne: jest.fn() };
    destinations = { findOne: jest.fn() };
    service = new FavoritesService(
      favorites,
      tours as unknown as Repository<Tour>,
      stays as unknown as Repository<Stay>,
      restaurants as unknown as Repository<Restaurant>,
      destinations as unknown as Repository<Destination>,
    );
  });

  it('snapshots the tour when adding a TOUR favourite', async () => {
    tours.findOne.mockResolvedValue({
      id: 't1',
      title: 'Kakum Canopy Walk',
      slug: 'kakum-canopy-walk',
      heroImageUrl: 'img',
    });
    await service.add('u1', { type: FavoriteType.TOUR, itemId: 't1' });
    expect(favorites.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        type: FavoriteType.TOUR,
        itemId: 't1',
        snapshot: expect.objectContaining({ title: 'Kakum Canopy Walk' }),
      }),
    );
  });

  it('404s when the favourited item does not exist', async () => {
    tours.findOne.mockResolvedValue(null);
    await expect(
      service.add('u1', { type: FavoriteType.TOUR, itemId: 'missing' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('409s on a duplicate favourite (unique violation)', async () => {
    tours.findOne.mockResolvedValue({ id: 't1', title: 'T', slug: 's' });
    const dup = new QueryFailedError('INSERT', [], new Error('dup'));
    (dup.driverError as { code?: string }).code = '23505';
    favorites.save.mockRejectedValueOnce(dup);
    await expect(
      service.add('u1', { type: FavoriteType.TOUR, itemId: 't1' }),
    ).rejects.toThrow(ConflictException);
  });

  it('404s removing a favourite that is not the user’s', async () => {
    favorites.findOne.mockResolvedValue(null);
    await expect(service.remove('u1', 'f-x')).rejects.toThrow(
      NotFoundException,
    );
  });
});
