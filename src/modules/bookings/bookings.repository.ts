import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { BookingTab } from './dto/booking-query.dto';
import { BookingItem } from './booking-item';
import { BookingStatus, TourBooking } from './entities/tour-booking.entity';

const LIVE = [BookingStatus.PENDING, BookingStatus.CONFIRMED];

@Injectable()
export class BookingsRepository {
  constructor(
    @InjectRepository(TourBooking)
    private readonly repo: Repository<TourBooking>,
  ) {}

  private scoped(manager?: EntityManager): Repository<TourBooking> {
    return manager ? manager.getRepository(TourBooking) : this.repo;
  }

  /** Sum of seats held by live (PENDING/CONFIRMED) bookings for a departure. */
  async seatsConsumed(
    departureId: string,
    manager?: EntityManager,
  ): Promise<number> {
    const row = await this.scoped(manager)
      .createQueryBuilder('b')
      .select('COALESCE(SUM(b.seats), 0)', 'sum')
      .where('b.departure_id = :departureId', { departureId })
      .andWhere('b.status IN (:...live)', { live: LIVE })
      .getRawOne<{ sum: string }>();
    return parseInt(row?.sum ?? '0', 10);
  }

  /** Count of bookings created this calendar year, for the reference sequence. */
  async countForYear(year: number, manager: EntityManager): Promise<number> {
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year + 1, 0, 1));
    return this.scoped(manager)
      .createQueryBuilder('b')
      .where('b.created_at >= :start AND b.created_at < :end', { start, end })
      .getCount();
  }

  create(input: Partial<TourBooking>, manager: EntityManager): TourBooking {
    return this.scoped(manager).create(input);
  }

  save(b: TourBooking, manager?: EntityManager): Promise<TourBooking> {
    return this.scoped(manager).save(b);
  }

  findByReference(
    reference: string,
    manager?: EntityManager,
  ): Promise<TourBooking | null> {
    return this.scoped(manager).findOne({ where: { reference } });
  }

  findById(id: string, manager?: EntityManager): Promise<TourBooking | null> {
    return this.scoped(manager).findOne({ where: { id } });
  }

  async findMine(
    touristId: string,
    tab: BookingTab | undefined,
    futureFrom: Date,
    skip: number,
    take: number,
  ): Promise<[TourBooking[], number]> {
    const qb = this.repo
      .createQueryBuilder('b')
      // tour_bookings.departure_id is varchar while tour_departures.id is uuid,
      // so the join needs an explicit cast to compare them.
      .leftJoin('tour_departures', 'd', 'd.id::text = b.departure_id')
      .where('b.tourist_id = :touristId', { touristId });

    if (tab === 'upcoming') {
      qb.andWhere('b.status IN (:...live)', { live: LIVE }).andWhere(
        'd.departs_at >= :now',
        { now: futureFrom },
      );
    } else if (tab === 'completed') {
      qb.andWhere('b.status = :s', { s: BookingStatus.COMPLETED });
    } else if (tab === 'cancelled') {
      qb.andWhere('b.status = :s', { s: BookingStatus.CANCELLED });
    }

    qb.orderBy('b.created_at', 'DESC').skip(skip).take(take);
    return qb.getManyAndCount();
  }

  /** Resolves a display summary of the tour behind each departure, in one query. */
  async itemsForDepartures(
    departureIds: string[],
  ): Promise<Map<string, BookingItem>> {
    const map = new Map<string, BookingItem>();
    if (departureIds.length === 0) return map;

    const rows = await this.repo.manager
      .createQueryBuilder()
      .select('d.id::text', 'departureId')
      .addSelect('d.departs_at', 'departsAt')
      .addSelect('t.id::text', 'tourId')
      .addSelect('t.slug', 'slug')
      .addSelect('t.title', 'title')
      .addSelect('t.hero_image_url', 'heroImageUrl')
      .from('tour_departures', 'd')
      // tour_departures.tour_id is varchar while tours.id is uuid.
      .innerJoin('tours', 't', 't.id::text = d.tour_id')
      .where('d.id IN (:...ids)', { ids: departureIds })
      .getRawMany<{
        departureId: string;
        departsAt: Date;
        tourId: string;
        slug: string;
        title: string;
        heroImageUrl: string | null;
      }>();

    for (const r of rows) {
      map.set(r.departureId, {
        id: r.tourId,
        slug: r.slug,
        title: r.title,
        imageUrl: r.heroImageUrl ?? undefined,
        startsAt: r.departsAt.toISOString(),
      });
    }
    return map;
  }

  findExpiredPending(
    before: Date,
    manager: EntityManager,
  ): Promise<TourBooking[]> {
    return this.scoped(manager)
      .createQueryBuilder('b')
      .where('b.status = :s', { s: BookingStatus.PENDING })
      .andWhere('b.created_at < :before', { before })
      .getMany();
  }

  findConfirmedForDepartures(
    departureIds: string[],
    manager: EntityManager,
  ): Promise<TourBooking[]> {
    if (departureIds.length === 0) return Promise.resolve([]);
    return this.scoped(manager).find({
      where: { status: BookingStatus.CONFIRMED, departureId: In(departureIds) },
    });
  }
}
