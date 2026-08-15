import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { RestaurantReview } from './entities/restaurant-review.entity';

@Injectable()
export class RestaurantReviewsRepository {
  constructor(
    @InjectRepository(RestaurantReview)
    private readonly repo: Repository<RestaurantReview>,
  ) {}

  existsForAuthor(restaurantId: string, authorId: string): Promise<boolean> {
    return this.repo.existsBy({ restaurantId, authorId });
  }

  save(
    input: Partial<RestaurantReview>,
    manager: EntityManager,
  ): Promise<RestaurantReview> {
    const repo = manager.getRepository(RestaurantReview);
    return repo.save(repo.create(input));
  }

  /** `author` is joined so the list can render who wrote each review. */
  findForRestaurant(
    restaurantId: string,
    skip: number,
    take: number,
  ): Promise<[RestaurantReview[], number]> {
    return this.repo.findAndCount({
      where: { restaurantId },
      relations: { author: true },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  findById(id: string): Promise<RestaurantReview | null> {
    return this.repo.findOne({
      where: { id },
      relations: { author: true },
    });
  }

  async remove(
    review: RestaurantReview,
    manager: EntityManager,
  ): Promise<void> {
    await manager.getRepository(RestaurantReview).remove(review);
  }
}
