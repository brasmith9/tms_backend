import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  OWNER_RESOLVER,
  OwnershipGuard,
} from '../../common/guards/ownership.guard';
import { LocationsModule } from '../locations/locations.module';
import { ReservationsModule } from '../reservations/reservations.module';
import { UsersModule } from '../users/users.module';
import { RestaurantReview } from './entities/restaurant-review.entity';
import { Restaurant } from './entities/restaurant.entity';
import { FoodController } from './food.controller';
import { FoodRepository } from './food.repository';
import { FoodService } from './food.service';
import { RestaurantReviewsController } from './restaurant-reviews.controller';
import { RestaurantReviewsRepository } from './restaurant-reviews.repository';
import { RestaurantReviewsService } from './restaurant-reviews.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Restaurant, RestaurantReview]),
    ReservationsModule,
    LocationsModule,
    UsersModule,
  ],
  controllers: [FoodController, RestaurantReviewsController],
  providers: [
    FoodService,
    FoodRepository,
    RestaurantReviewsService,
    RestaurantReviewsRepository,
    OwnershipGuard,
    { provide: OWNER_RESOLVER, useExisting: FoodService },
  ],
  exports: [FoodService, FoodRepository],
})
export class FoodModule {}
