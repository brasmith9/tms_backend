import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { LocationQueryDto } from './dto/location-query.dto';
import { Location } from './entities/location.entity';

@Injectable()
export class LocationsRepository {
  constructor(
    @InjectRepository(Location)
    private readonly repo: Repository<Location>,
  ) {}

  /** Applies the SQL-able filters; distance and radius are computed in the service. */
  search(q: LocationQueryDto): Promise<Location[]> {
    const qb = this.repo.createQueryBuilder('l');
    if (q.q) {
      qb.andWhere('(l.name ILIKE :q OR l.description ILIKE :q)', {
        q: `%${q.q}%`,
      });
    }
    if (q.category) {
      qb.andWhere('l.category = :category', { category: q.category });
    }
    return qb.orderBy('l.name', 'ASC').getMany();
  }

  findBySlug(slug: string): Promise<Location | null> {
    return this.repo.findOne({ where: { slug } });
  }

  findById(id: string): Promise<Location | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByIds(ids: string[]): Promise<Location[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.repo.find({ where: { id: In(ids) } });
  }

  existsBySlug(slug: string): Promise<boolean> {
    return this.repo.existsBy({ slug });
  }

  create(input: Partial<Location>): Location {
    return this.repo.create(input);
  }

  save(l: Location): Promise<Location> {
    return this.repo.save(l);
  }

  remove(l: Location): Promise<Location> {
    return this.repo.remove(l);
  }
}
