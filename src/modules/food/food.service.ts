import { Injectable, NotFoundException } from '@nestjs/common';
import { distanceKm } from '../../common/geo/haversine';
import {
  Paginated,
  applyPagination,
  paginate,
} from '../../common/pagination/paginate';
import {
  Reservation,
  ReservationType,
} from '../reservations/entities/reservation.entity';
import { ReservationsService } from '../reservations/reservations.service';
import { RestaurantQueryDto } from './dto/restaurant-query.dto';
import { RestaurantResponseDto } from './dto/restaurant-response.dto';
import { ReserveTableDto } from './dto/reserve-table.dto';
import { Restaurant } from './entities/restaurant.entity';
import { FoodRepository } from './food.repository';
import { availableSlots, isOpenAt } from './opening-hours';

@Injectable()
export class FoodService {
  constructor(
    private readonly repo: FoodRepository,
    private readonly reservations: ReservationsService,
  ) {}

  async search(
    q: RestaurantQueryDto,
  ): Promise<Paginated<RestaurantResponseDto>> {
    const now = new Date();
    const hasLocation = q.lat !== undefined && q.lng !== undefined;

    let rows = (await this.repo.search(q)).map((r) => ({
      restaurant: r,
      isOpenNow: isOpenAt(r.openingHours, now),
      distanceKm: hasLocation
        ? distanceKm(q.lat!, q.lng!, r.lat, r.lng)
        : undefined,
    }));

    if (q.openNow) rows = rows.filter((x) => x.isOpenNow);
    if (hasLocation) {
      rows.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    }

    const { skip, take } = applyPagination(q);
    const page = rows.slice(skip, skip + take);
    return paginate(
      page.map((x) =>
        RestaurantResponseDto.from(x.restaurant, x.isOpenNow, x.distanceKm),
      ),
      rows.length,
      q,
    );
  }

  async findBySlug(slug: string): Promise<RestaurantResponseDto> {
    const r = await this.repo.findBySlug(slug);
    if (!r) throw new NotFoundException(`Restaurant ${slug} not found`);
    return RestaurantResponseDto.from(r, isOpenAt(r.openingHours, new Date()));
  }

  async menu(id: string): Promise<Restaurant['menu']> {
    const r = await this.byIdOrThrow(id);
    return r.menu;
  }

  async availability(
    id: string,
    date: Date,
    partySize: number,
  ): Promise<{ date: string; partySize: number; slots: string[] }> {
    const r = await this.byIdOrThrow(id);
    return {
      date: date.toISOString(),
      partySize,
      slots: availableSlots(r.openingHours, date),
    };
  }

  async reserve(
    userId: string,
    id: string,
    dto: ReserveTableDto,
  ): Promise<Reservation> {
    const r = await this.byIdOrThrow(id);
    return this.reservations.create({
      userId,
      type: ReservationType.TABLE,
      totalMinor: 0,
      confirmImmediately: true, // a table booking is free
      item: {
        id: r.id,
        slug: r.slug,
        title: r.name,
        subtitle: `Table for ${dto.partySize}`,
        imageUrl: r.heroImageUrl,
        startsAt: dto.at.toISOString(),
      },
    });
  }

  private async byIdOrThrow(id: string): Promise<Restaurant> {
    const r = await this.repo.findById(id);
    if (!r) throw new NotFoundException(`Restaurant ${id} not found`);
    return r;
  }
}
