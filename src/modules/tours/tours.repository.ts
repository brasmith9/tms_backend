import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { CandidateTour } from './candidate-tour';
import { TourQueryDto } from './dto/tour-query.dto';
import { Destination } from '../destinations/entities/destination.entity';
import { Tour, TourStatus } from './entities/tour.entity';

const SORTS: Record<string, { column: string; direction: 'ASC' | 'DESC' }> = {
  price: { column: 'tour.price_minor', direction: 'ASC' },
  '-price': { column: 'tour.price_minor', direction: 'DESC' },
  title: { column: 'tour.title', direction: 'ASC' },
};

@Injectable()
export class ToursRepository {
  constructor(
    @InjectRepository(Tour) private readonly repo: Repository<Tour>,
  ) {}

  create(input: Partial<Tour>): Tour {
    return this.repo.create(input);
  }

  save(tour: Tour): Promise<Tour> {
    return this.repo.save(tour);
  }

  findById(id: string): Promise<Tour | null> {
    return this.repo.findOne({ where: { id } });
  }

  findBySlug(slug: string): Promise<Tour | null> {
    return this.repo.findOne({ where: { slug } });
  }

  existsBySlug(slug: string): Promise<boolean> {
    return this.repo.existsBy({ slug });
  }

  async searchApproved(
    q: TourQueryDto,
    skip: number,
    take: number,
  ): Promise<[Tour[], number]> {
    const qb = this.repo
      .createQueryBuilder('tour')
      .where('tour.status = :status', { status: TourStatus.APPROVED });

    if (q.q) {
      qb.andWhere('(tour.title ILIKE :q OR tour.description ILIKE :q)', {
        q: `%${q.q}%`,
      });
    }
    if (q.destinationId) {
      qb.andWhere('tour.destination_id = :destinationId', {
        destinationId: q.destinationId,
      });
    }
    if (q.minPrice !== undefined) {
      qb.andWhere('tour.price_minor >= :minPrice', { minPrice: q.minPrice });
    }
    if (q.maxPrice !== undefined) {
      qb.andWhere('tour.price_minor <= :maxPrice', { maxPrice: q.maxPrice });
    }

    const sort = (q.sort && SORTS[q.sort]) || {
      column: 'tour.created_at',
      direction: 'DESC' as const,
    };
    qb.orderBy(sort.column, sort.direction).skip(skip).take(take);

    return qb.getManyAndCount();
  }

  findOneApproved(id: string, manager?: EntityManager): Promise<Tour | null> {
    const r = manager ? manager.getRepository(Tour) : this.repo;
    return r.findOne({ where: { id, status: TourStatus.APPROVED } });
  }

  /** Approved tours whose destination name matches, as planner grounding. */
  async findApprovedByDestinationName(
    name: string,
    limit: number,
  ): Promise<CandidateTour[]> {
    const rows = await this.repo
      .createQueryBuilder('tour')
      // tours.destination_id is varchar while destinations.id is uuid, so the
      // join needs an explicit cast to compare them.
      .innerJoin(Destination, 'dest', 'dest.id::text = tour.destination_id')
      .where('tour.status = :status', { status: TourStatus.APPROVED })
      .andWhere('LOWER(dest.name) LIKE :name', {
        name: `%${name.toLowerCase()}%`,
      })
      .orderBy('tour.rating_avg', 'DESC')
      .limit(limit)
      .select('tour.id', 'id')
      .addSelect('tour.slug', 'slug')
      .addSelect('tour.title', 'title')
      .addSelect('dest.name', 'destinationName')
      .addSelect('tour.price_minor', 'priceMinor')
      .addSelect('tour.duration_minutes', 'durationMinutes')
      .getRawMany<{
        id: string;
        slug: string;
        title: string;
        destinationName: string;
        priceMinor: string;
        durationMinutes: string;
      }>();

    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      destinationName: r.destinationName,
      priceMinor: Number(r.priceMinor),
      durationMinutes: Number(r.durationMinutes),
    }));
  }
}
