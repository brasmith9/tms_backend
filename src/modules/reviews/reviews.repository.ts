import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Review } from './entities/review.entity';

@Injectable()
export class ReviewsRepository {
  constructor(
    @InjectRepository(Review) private readonly repo: Repository<Review>,
  ) {}

  existsForBooking(bookingId: string): Promise<boolean> {
    return this.repo.existsBy({ bookingId });
  }

  save(input: Partial<Review>, manager: EntityManager): Promise<Review> {
    const repo = manager.getRepository(Review);
    return repo.save(repo.create(input));
  }

  findForTour(
    tourId: string,
    skip: number,
    take: number,
  ): Promise<[Review[], number]> {
    return this.repo.findAndCount({
      where: { tourId },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }
}
