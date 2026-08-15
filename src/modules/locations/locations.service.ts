import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { distanceKm } from '../../common/geo/haversine';
import {
  Paginated,
  applyPagination,
  paginate,
} from '../../common/pagination/paginate';
import { CreateLocationDto } from './dto/create-location.dto';
import { LocationQueryDto } from './dto/location-query.dto';
import { LocationResponseDto } from './dto/location-response.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { Location } from './entities/location.entity';
import { LocationsRepository } from './locations.repository';

@Injectable()
export class LocationsService {
  constructor(private readonly repo: LocationsRepository) {}

  async search(q: LocationQueryDto): Promise<Paginated<LocationResponseDto>> {
    const hasLocation = q.lat !== undefined && q.lng !== undefined;

    let rows = (await this.repo.search(q)).map((location) => ({
      location,
      distanceKm: hasLocation
        ? distanceKm(q.lat!, q.lng!, location.lat, location.lng)
        : undefined,
    }));

    // radiusKm and distance sort only mean anything against an origin point.
    if (hasLocation) {
      if (q.radiusKm !== undefined) {
        rows = rows.filter((x) => x.distanceKm! <= q.radiusKm!);
      }
      rows.sort((a, b) => a.distanceKm! - b.distanceKm!);
    }

    const { skip, take } = applyPagination(q);
    const page = rows.slice(skip, skip + take);
    return paginate(
      page.map((x) => LocationResponseDto.from(x.location, x.distanceKm)),
      rows.length,
      q,
    );
  }

  async findBySlug(slug: string): Promise<LocationResponseDto> {
    const l = await this.repo.findBySlug(slug);
    if (!l) throw new NotFoundException(`Location ${slug} not found`);
    return LocationResponseDto.from(l);
  }

  async findById(id: string): Promise<Location> {
    const l = await this.repo.findById(id);
    if (!l) throw new NotFoundException(`Location ${id} not found`);
    return l;
  }

  async create(dto: CreateLocationDto): Promise<Location> {
    if (await this.repo.existsBySlug(dto.slug)) {
      throw new ConflictException(`Location slug ${dto.slug} is already taken`);
    }
    return this.repo.save(this.repo.create({ photos: [], ...dto }));
  }

  async update(id: string, dto: UpdateLocationDto): Promise<Location> {
    const l = await this.findById(id);
    if (
      dto.slug &&
      dto.slug !== l.slug &&
      (await this.repo.existsBySlug(dto.slug))
    ) {
      throw new ConflictException(`Location slug ${dto.slug} is already taken`);
    }
    Object.assign(l, dto);
    return this.repo.save(l);
  }

  async remove(id: string): Promise<void> {
    await this.repo.remove(await this.findById(id));
  }
}
