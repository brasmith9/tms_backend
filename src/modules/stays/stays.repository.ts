import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { cedisToPesewas } from '../../common/money';
import { StayQueryDto } from './dto/stay-query.dto';
import { Room } from './entities/room.entity';
import { Stay } from './entities/stay.entity';

@Injectable()
export class StaysRepository {
  constructor(
    @InjectRepository(Stay) private readonly stays: Repository<Stay>,
    @InjectRepository(Room) private readonly rooms: Repository<Room>,
  ) {}

  /** SQL-able filters; distance is computed in the service. */
  search(q: StayQueryDto): Promise<Stay[]> {
    const qb = this.stays.createQueryBuilder('s');
    if (q.q) {
      qb.andWhere(
        '(s.name ILIKE :q OR s.location ILIKE :q OR s.description ILIKE :q)',
        { q: `%${q.q}%` },
      );
    }
    if (q.category) qb.andWhere('s.category = :cat', { cat: q.category });
    if (q.minPrice !== undefined) {
      qb.andWhere('s.from_price_minor >= :min', {
        min: cedisToPesewas(q.minPrice),
      });
    }
    if (q.maxPrice !== undefined) {
      qb.andWhere('s.from_price_minor <= :max', {
        max: cedisToPesewas(q.maxPrice),
      });
    }
    return qb.orderBy('s.rating_avg', 'DESC').getMany();
  }

  findBySlug(slug: string): Promise<Stay | null> {
    return this.stays.findOne({ where: { slug } });
  }

  findById(id: string): Promise<Stay | null> {
    return this.stays.findOne({ where: { id } });
  }

  roomsFor(stayId: string, minGuests?: number): Promise<Room[]> {
    const qb = this.rooms
      .createQueryBuilder('r')
      .where('r.stay_id = :stayId', { stayId });
    if (minGuests !== undefined) {
      qb.andWhere('r.max_guests >= :g', { g: minGuests });
    }
    return qb.orderBy('r.price_per_night_minor', 'ASC').getMany();
  }

  findRoom(id: string): Promise<Room | null> {
    return this.rooms.findOne({ where: { id } });
  }
}
