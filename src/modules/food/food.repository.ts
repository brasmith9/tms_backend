import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RestaurantQueryDto } from './dto/restaurant-query.dto';
import { Restaurant } from './entities/restaurant.entity';

@Injectable()
export class FoodRepository {
  constructor(
    @InjectRepository(Restaurant)
    private readonly repo: Repository<Restaurant>,
  ) {}

  /** Applies the SQL-able filters; open-now and distance are computed in the service. */
  search(q: RestaurantQueryDto): Promise<Restaurant[]> {
    const qb = this.repo.createQueryBuilder('r');
    if (q.q) {
      qb.andWhere(
        '(r.name ILIKE :q OR r.cuisine ILIKE :q OR r.description ILIKE :q)',
        { q: `%${q.q}%` },
      );
    }
    if (q.cuisine) {
      qb.andWhere('r.cuisine ILIKE :cuisine', { cuisine: q.cuisine });
    }
    if (q.priceTier !== undefined) {
      qb.andWhere('r.price_tier = :tier', { tier: q.priceTier });
    }
    if (q.dietary) {
      qb.andWhere('r.dietary @> cast(:diet as jsonb)', {
        diet: JSON.stringify([q.dietary]),
      });
    }
    return qb.orderBy('r.rating_avg', 'DESC').getMany();
  }

  findBySlug(slug: string): Promise<Restaurant | null> {
    return this.repo.findOne({ where: { slug } });
  }

  findById(id: string): Promise<Restaurant | null> {
    return this.repo.findOne({ where: { id } });
  }
}
