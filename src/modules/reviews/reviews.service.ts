import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  Paginated,
  applyPagination,
  paginate,
} from '../../common/pagination/paginate';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { BookingsService } from '../bookings/bookings.service';
import { BookingStatus } from '../bookings/entities/tour-booking.entity';
import { TourDeparturesService } from '../tours/tour-departures.service';
import { ToursService } from '../tours/tours.service';
import type { AuthUser } from '../auth/auth-user.type';
import { CreateReviewDto } from './dto/create-review.dto';
import { Review } from './entities/review.entity';
import { ReviewsRepository } from './reviews.repository';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly repo: ReviewsRepository,
    private readonly bookings: BookingsService,
    private readonly tours: ToursService,
    private readonly departures: TourDeparturesService,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    reference: string,
    author: AuthUser,
    dto: CreateReviewDto,
  ): Promise<Review> {
    const booking = await this.bookings.findByReference(reference, author);
    if (booking.touristId !== author.id) {
      throw new ConflictException('You can only review your own booking');
    }
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new ConflictException('Only a completed booking can be reviewed');
    }
    if (await this.repo.existsForBooking(booking.id)) {
      throw new ConflictException('This booking has already been reviewed');
    }
    const tourId = await this.departures.tourIdFor(booking.departureId);
    if (!tourId) throw new NotFoundException('Tour not found for booking');

    return this.dataSource.transaction(async (manager) => {
      const review = await this.repo.save(
        {
          tourId,
          bookingId: booking.id,
          authorId: author.id,
          rating: dto.rating,
          body: dto.body,
        },
        manager,
      );
      await this.tours.applyRating(tourId, dto.rating, manager);
      return review;
    });
  }

  async listForTour(
    tourId: string,
    q: PaginationQueryDto,
  ): Promise<Paginated<Review>> {
    const { skip, take } = applyPagination(q);
    const [data, total] = await this.repo.findForTour(tourId, skip, take);
    return paginate(data, total, q);
  }
}
