import { ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { RestaurantReview } from './entities/restaurant-review.entity';
import { FoodService } from './food.service';
import { RestaurantReviewsRepository } from './restaurant-reviews.repository';
import { RestaurantReviewsService } from './restaurant-reviews.service';
import { UsersService } from '../users/users.service';

describe('RestaurantReviewsService', () => {
  let repo: Record<string, jest.Mock>;
  let food: Record<string, jest.Mock>;
  let users: Record<string, jest.Mock>;
  let dataSource: DataSource;
  let service: RestaurantReviewsService;
  const manager = {} as EntityManager;

  beforeEach(() => {
    repo = {
      existsForAuthor: jest.fn().mockResolvedValue(false),
      save: jest.fn((input: Partial<RestaurantReview>) =>
        Promise.resolve({ id: 'rev1', ...input } as RestaurantReview),
      ),
      findForRestaurant: jest.fn().mockResolvedValue([[], 0]),
    };
    food = {
      byIdOrThrow: jest.fn().mockResolvedValue({ id: 'r1' }),
      applyRating: jest.fn().mockResolvedValue(undefined),
      setRating: jest.fn().mockResolvedValue(undefined),
    };
    users = {
      findById: jest
        .fn()
        .mockResolvedValue({ fullName: 'Ama Owusu', avatarUrl: 'a.png' }),
    };
    dataSource = {
      transaction: jest.fn((fn: (m: EntityManager) => Promise<unknown>) =>
        fn(manager),
      ),
    } as unknown as DataSource;
    service = new RestaurantReviewsService(
      repo as unknown as RestaurantReviewsRepository,
      food as unknown as FoodService,
      users as unknown as UsersService,
      dataSource,
    );
  });

  it('saves the review and folds the rating into the restaurant average', async () => {
    const review = await service.create('r1', 'u1', {
      rating: 5,
      body: 'Best waakye on campus.',
    });

    expect(review.id).toBe('rev1');
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        restaurantId: 'r1',
        authorId: 'u1',
        rating: 5,
      }),
      manager,
    );
    // Both writes share the one transaction, so a failed aggregate rolls the
    // review back rather than leaving a review the average does not reflect.
    expect(food.applyRating).toHaveBeenCalledWith('r1', 5, manager);
  });

  it('rejects a second review from the same diner', async () => {
    repo.existsForAuthor.mockResolvedValue(true);

    await expect(
      service.create('r1', 'u1', { rating: 4, body: 'Again.' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('404s for an unknown restaurant before touching the review table', async () => {
    food.byIdOrThrow.mockRejectedValue(new NotFoundException());

    await expect(
      service.create('missing', 'u1', { rating: 4, body: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.existsForAuthor).not.toHaveBeenCalled();
  });

  it('attaches the author so the response can name the reviewer', async () => {
    const review = await service.create('r1', 'u1', {
      rating: 4,
      body: 'Good.',
    });

    expect(users.findById).toHaveBeenCalledWith('u1');
    expect(review.author).toMatchObject({ fullName: 'Ama Owusu' });
  });

  describe('moderation', () => {
    beforeEach(() => {
      repo.findById = jest
        .fn()
        .mockResolvedValue({ id: 'rev1', restaurantId: 'r1' });
      repo.remove = jest.fn().mockResolvedValue(undefined);
      repo.ratingSummary = jest.fn().mockResolvedValue({ count: 2, avg: 4.5 });
    });

    it('removes the review and recomputes the aggregate from what remains', async () => {
      await service.remove('r1', 'rev1');

      expect(repo.remove).toHaveBeenCalledWith(
        { id: 'rev1', restaurantId: 'r1' },
        manager,
      );
      // Recomputed, not decremented — a running average cannot be reversed.
      expect(food.setRating).toHaveBeenCalledWith('r1', 2, 4.5, manager);
    });

    it('zeroes the aggregate when the last review goes', async () => {
      repo.ratingSummary.mockResolvedValue({ count: 0, avg: 0 });

      await service.remove('r1', 'rev1');

      expect(food.setRating).toHaveBeenCalledWith('r1', 0, 0, manager);
    });

    it('404s a review that belongs to a different restaurant', async () => {
      repo.findById.mockResolvedValue({ id: 'rev1', restaurantId: 'other' });

      await expect(service.remove('r1', 'rev1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repo.remove).not.toHaveBeenCalled();
    });

    it('404s an unknown review', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.remove('r1', 'rev1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  it('paginates the listing with the shared envelope shape', async () => {
    repo.findForRestaurant.mockResolvedValue([
      [{ id: 'rev1' } as RestaurantReview],
      7,
    ]);

    const page = await service.listForRestaurant('r1', { page: 2, limit: 3 });

    expect(repo.findForRestaurant).toHaveBeenCalledWith('r1', 3, 3);
    expect(page).toMatchObject({
      total: 7,
      page: 2,
      pageSize: 3,
      totalPages: 3,
    });
  });
});
