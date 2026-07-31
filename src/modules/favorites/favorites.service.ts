import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  Paginated,
  applyPagination,
  paginate,
} from '../../common/pagination/paginate';
import { Destination } from '../destinations/entities/destination.entity';
import { Restaurant } from '../food/entities/restaurant.entity';
import { Stay } from '../stays/entities/stay.entity';
import { Tour } from '../tours/entities/tour.entity';
import { CreateFavoriteDto, FavoriteQueryDto } from './dto/favorite.dto';
import {
  Favorite,
  FavoriteSnapshot,
  FavoriteType,
} from './entities/favorite.entity';

const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private readonly favorites: Repository<Favorite>,
    @InjectRepository(Tour) private readonly tours: Repository<Tour>,
    @InjectRepository(Stay) private readonly stays: Repository<Stay>,
    @InjectRepository(Restaurant)
    private readonly restaurants: Repository<Restaurant>,
    @InjectRepository(Destination)
    private readonly destinations: Repository<Destination>,
  ) {}

  async add(userId: string, dto: CreateFavoriteDto): Promise<Favorite> {
    const snapshot = await this.resolveSnapshot(dto.type, dto.itemId);
    try {
      return await this.favorites.save(
        this.favorites.create({
          userId,
          type: dto.type,
          itemId: dto.itemId,
          snapshot,
        }),
      );
    } catch (err) {
      if (
        err instanceof QueryFailedError &&
        (err.driverError as { code?: string })?.code === PG_UNIQUE_VIOLATION
      ) {
        throw new ConflictException('Already in your favourites');
      }
      throw err;
    }
  }

  async list(
    userId: string,
    q: FavoriteQueryDto,
  ): Promise<Paginated<Favorite>> {
    const { skip, take } = applyPagination(q);
    const [data, total] = await this.favorites.findAndCount({
      where: q.type ? { userId, type: q.type } : { userId },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
    return paginate(data, total, q as PaginationQueryDto);
  }

  async remove(userId: string, id: string): Promise<void> {
    const favorite = await this.favorites.findOne({ where: { id, userId } });
    if (!favorite) throw new NotFoundException(`Favourite ${id} not found`);
    await this.favorites.remove(favorite);
  }

  /** Snapshots the favourited item so lists render without per-item fetches. */
  private async resolveSnapshot(
    type: FavoriteType,
    itemId: string,
  ): Promise<FavoriteSnapshot> {
    switch (type) {
      case FavoriteType.TOUR: {
        const t = await this.tours.findOne({ where: { id: itemId } });
        if (!t) break;
        return { title: t.title, imageUrl: t.heroImageUrl, slug: t.slug };
      }
      case FavoriteType.STAY: {
        const s = await this.stays.findOne({ where: { id: itemId } });
        if (!s) break;
        return { title: s.name, imageUrl: s.heroImageUrl, slug: s.slug };
      }
      case FavoriteType.RESTAURANT: {
        const r = await this.restaurants.findOne({ where: { id: itemId } });
        if (!r) break;
        return { title: r.name, imageUrl: r.heroImageUrl, slug: r.slug };
      }
      case FavoriteType.DESTINATION: {
        const d = await this.destinations.findOne({ where: { id: itemId } });
        if (!d) break;
        return { title: d.name, imageUrl: d.heroImageUrl };
      }
    }
    throw new NotFoundException(`No ${type} with id ${itemId}`);
  }
}
