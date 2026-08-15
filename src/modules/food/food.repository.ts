import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { Location } from '../locations/entities/location.entity';
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
    // Left-joined purely so `q` and the slug filter can reach the landmark's
    // name; the joined row itself is not selected.
    qb.leftJoin(Location, 'loc', 'loc.id = r.nearest_location_id');
    if (q.q) {
      qb.andWhere(
        '(r.name ILIKE :q OR r.cuisine ILIKE :q OR r.description ILIKE :q OR loc.name ILIKE :q)',
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
    if (q.nearestLocationId) {
      qb.andWhere('r.nearest_location_id = :locId', {
        locId: q.nearestLocationId,
      });
    }
    if (q.nearestLocationSlug) {
      qb.andWhere('loc.slug = :locSlug', { locSlug: q.nearestLocationSlug });
    }
    return qb.orderBy('r.rating_avg', 'DESC').getMany();
  }

  findBySlug(slug: string): Promise<Restaurant | null> {
    return this.repo.findOne({ where: { slug } });
  }

  findAndCountByOwner(
    ownerId: string,
    skip: number,
    take: number,
  ): Promise<[Restaurant[], number]> {
    return this.repo.findAndCount({
      where: { ownerId },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  findById(id: string): Promise<Restaurant | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByIds(ids: string[]): Promise<Restaurant[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.repo.find({ where: { id: In(ids) } });
  }

  existsBySlug(slug: string): Promise<boolean> {
    return this.repo.existsBy({ slug });
  }

  create(input: Partial<Restaurant>): Restaurant {
    return this.repo.create(input);
  }

  save(r: Restaurant, manager?: EntityManager): Promise<Restaurant> {
    return (manager?.getRepository(Restaurant) ?? this.repo).save(r);
  }
}
