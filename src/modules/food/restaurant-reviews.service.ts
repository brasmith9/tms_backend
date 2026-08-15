import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  Paginated,
  applyPagination,
  paginate,
} from '../../common/pagination/paginate';
import { CreateReviewDto } from '../reviews/dto/create-review.dto';
import { UsersService } from '../users/users.service';
import { RestaurantReview } from './entities/restaurant-review.entity';
import { FoodService } from './food.service';
import { RestaurantReviewsRepository } from './restaurant-reviews.repository';

@Injectable()
export class RestaurantReviewsService {
  constructor(
    private readonly repo: RestaurantReviewsRepository,
    private readonly food: FoodService,
    private readonly users: UsersService,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    restaurantId: string,
    authorId: string,
    dto: CreateReviewDto,
  ): Promise<RestaurantReview> {
    await this.food.byIdOrThrow(restaurantId); // 404 if unknown
    if (await this.repo.existsForAuthor(restaurantId, authorId)) {
      throw new ConflictException('You have already reviewed this restaurant');
    }

    const review = await this.dataSource.transaction(async (manager) => {
      const saved = await this.repo.save(
        { restaurantId, authorId, rating: dto.rating, body: dto.body },
        manager,
      );
      await this.food.applyRating(restaurantId, dto.rating, manager);
      return saved;
    });

    // The insert does not populate the relation, and the response has to carry
    // the author's name — so attach it before handing the row back.
    review.author = await this.users.findById(authorId);
    return review;
  }

  async listForRestaurant(
    restaurantId: string,
    q: PaginationQueryDto,
  ): Promise<Paginated<RestaurantReview>> {
    await this.food.byIdOrThrow(restaurantId); // 404 if unknown
    const { skip, take } = applyPagination(q);
    const [data, total] = await this.repo.findForRestaurant(
      restaurantId,
      skip,
      take,
    );
    return paginate(data, total, q);
  }

  /** Admin moderation — SRS §7. Recomputes the aggregate from what remains. */
  async remove(restaurantId: string, reviewId: string): Promise<void> {
    await this.food.byIdOrThrow(restaurantId);
    const review = await this.repo.findById(reviewId);
    if (!review || review.restaurantId !== restaurantId) {
      throw new NotFoundException(`Review ${reviewId} not found`);
    }

    await this.dataSource.transaction(async (manager) => {
      await this.repo.remove(review, manager);
      await this.food.withdrawRating(restaurantId, review.rating, manager);
    });
  }
}
