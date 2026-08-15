import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { EntityManager } from 'typeorm';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { distanceKm } from '../../common/geo/haversine';
import { cedisToPesewas } from '../../common/money';
import {
  Paginated,
  applyPagination,
  paginate,
} from '../../common/pagination/paginate';
import { Location } from '../locations/entities/location.entity';
import { LocationsRepository } from '../locations/locations.repository';
import {
  Reservation,
  ReservationType,
} from '../reservations/entities/reservation.entity';
import { ReservationsService } from '../reservations/reservations.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { RestaurantQueryDto } from './dto/restaurant-query.dto';
import {
  NearestLocationDto,
  RestaurantResponseDto,
} from './dto/restaurant-response.dto';
import { ReserveTableDto } from './dto/reserve-table.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { MenuSection, Restaurant } from './entities/restaurant.entity';
import { FoodRepository } from './food.repository';
import { availableSlots, isOpenAt } from './opening-hours';

@Injectable()
export class FoodService {
  constructor(
    private readonly repo: FoodRepository,
    private readonly reservations: ReservationsService,
    private readonly locations: LocationsRepository,
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
    // One lookup for the whole page rather than one per row.
    const landmarks = await this.landmarksFor(page.map((x) => x.restaurant));
    return paginate(
      page.map((x) =>
        RestaurantResponseDto.from(
          x.restaurant,
          x.isOpenNow,
          x.distanceKm,
          landmarks.get(x.restaurant.nearestLocationId ?? ''),
        ),
      ),
      rows.length,
      q,
    );
  }

  async findBySlug(slug: string): Promise<RestaurantResponseDto> {
    const r = await this.repo.findBySlug(slug);
    if (!r) throw new NotFoundException(`Restaurant ${slug} not found`);
    return this.toDto(r);
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

  // --- vendor write path -------------------------------------------------

  async create(
    ownerId: string,
    dto: CreateRestaurantDto,
  ): Promise<RestaurantResponseDto> {
    await this.assertLandmarkExists(dto.nearestLocationId);
    const slug = await this.uniqueSlug(dto.name);
    const saved = await this.repo.save(
      this.repo.create({
        ...dto,
        slug,
        ownerId,
        images: dto.images ?? [],
        dietary: dto.dietary ?? [],
        openingHours: dto.openingHours ?? [],
        menu: [],
      }),
    );
    return this.toDto(saved);
  }

  async update(
    id: string,
    dto: UpdateRestaurantDto,
  ): Promise<RestaurantResponseDto> {
    const r = await this.byIdOrThrow(id);
    await this.assertLandmarkExists(dto.nearestLocationId);
    Object.assign(r, dto);
    return this.toDto(await this.repo.save(r));
  }

  /** Whole-menu replacement; prices arrive as decimal cedis and are stored minor. */
  async replaceMenu(id: string, dto: UpdateMenuDto): Promise<MenuSection[]> {
    const r = await this.byIdOrThrow(id);
    r.menu = dto.sections.map((s) => ({
      category: s.category,
      items: s.items.map((i) => ({
        name: i.name,
        description: i.description,
        priceMinor: cedisToPesewas(i.price),
        photoUrl: i.photoUrl,
      })),
    }));
    const saved = await this.repo.save(r);
    return saved.menu;
  }

  /** Resolver behind OwnershipGuard on the vendor routes. */
  async ownerIdFor(restaurantId: string): Promise<string | null> {
    const r = await this.repo.findById(restaurantId);
    return r?.ownerId ?? null;
  }

  /** Folds one new rating into the running average. Mirrors ToursService. */
  async applyRating(
    restaurantId: string,
    rating: number,
    manager: EntityManager,
  ): Promise<void> {
    const repo = manager.getRepository(Restaurant);
    const r = await repo.findOneOrFail({ where: { id: restaurantId } });
    const newCount = r.ratingCount + 1;
    // Rounded to 2dp: the raw quotient is a long float and this value goes
    // straight out on the API as a star rating.
    r.ratingAvg = round2((r.ratingAvg * r.ratingCount + rating) / newCount);
    r.ratingCount = newCount;
    await repo.save(r);
  }

  /**
   * Backs one rating out of the running average, for a moderated review.
   *
   * Deliberately reverses the arithmetic rather than recounting the review
   * rows: a restaurant's `ratingCount` can legitimately exceed the number of
   * stored reviews (seeded and imported ratings have no row behind them), so
   * recomputing from rows would erase that history on the first moderation.
   */
  async withdrawRating(
    restaurantId: string,
    rating: number,
    manager: EntityManager,
  ): Promise<void> {
    const repo = manager.getRepository(Restaurant);
    const r = await repo.findOneOrFail({ where: { id: restaurantId } });
    const newCount = Math.max(r.ratingCount - 1, 0);
    r.ratingAvg =
      newCount === 0
        ? 0
        : round2((r.ratingAvg * r.ratingCount - rating) / newCount);
    r.ratingCount = newCount;
    await repo.save(r);
  }

  /** Listings owned by a vendor — without this a vendor cannot read back their own. */
  async findMine(
    ownerId: string,
    q: PaginationQueryDto,
  ): Promise<Paginated<RestaurantResponseDto>> {
    const { skip, take } = applyPagination(q);
    const [rows, total] = await this.repo.findAndCountByOwner(
      ownerId,
      skip,
      take,
    );
    const landmarks = await this.landmarksFor(rows);
    const now = new Date();
    return paginate(
      rows.map((r) =>
        RestaurantResponseDto.from(
          r,
          isOpenAt(r.openingHours, now),
          undefined,
          landmarks.get(r.nearestLocationId ?? ''),
        ),
      ),
      total,
      q,
    );
  }

  async byIdOrThrow(id: string): Promise<Restaurant> {
    const r = await this.repo.findById(id);
    if (!r) throw new NotFoundException(`Restaurant ${id} not found`);
    return r;
  }

  // --- helpers -----------------------------------------------------------

  private async toDto(r: Restaurant): Promise<RestaurantResponseDto> {
    const landmarks = await this.landmarksFor([r]);
    return RestaurantResponseDto.from(
      r,
      isOpenAt(r.openingHours, new Date()),
      undefined,
      landmarks.get(r.nearestLocationId ?? ''),
    );
  }

  private async landmarksFor(
    rows: Restaurant[],
  ): Promise<Map<string, NearestLocationDto>> {
    const ids = [
      ...new Set(
        rows.map((r) => r.nearestLocationId).filter((id): id is string => !!id),
      ),
    ];
    const found = await this.locations.findByIds(ids);
    return new Map(found.map((l: Location) => [l.id, toLandmark(l)]));
  }

  private async assertLandmarkExists(id?: string): Promise<void> {
    if (!id) return;
    if (!(await this.locations.findById(id))) {
      throw new NotFoundException(`Location ${id} not found`);
    }
  }

  /** Mirrors ToursService: slugified name plus a short suffix for uniqueness. */
  private async uniqueSlug(name: string): Promise<string> {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    for (let attempt = 0; attempt < 5; attempt++) {
      const slug = `${base}-${randomBytes(3).toString('hex')}`;
      if (!(await this.repo.existsBySlug(slug))) return slug;
    }
    throw new ConflictException('Could not allocate a unique slug');
  }
}

/** Star ratings are rendered to one or two decimals; store them that way. */
const round2 = (n: number): number => Math.round(n * 100) / 100;

const toLandmark = (l: Location): NearestLocationDto => ({
  id: l.id,
  slug: l.slug,
  name: l.name,
});
