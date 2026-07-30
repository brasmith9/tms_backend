import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { EntityManager } from 'typeorm';
import {
  Paginated,
  applyPagination,
  paginate,
} from '../../common/pagination/paginate';
import { DestinationsService } from '../destinations/destinations.service';
import { CandidateTour } from './candidate-tour';
import { CreateTourDto } from './dto/create-tour.dto';
import { UpdateTourDto } from './dto/update-tour.dto';
import { TourQueryDto } from './dto/tour-query.dto';
import { Tour, TourStatus } from './entities/tour.entity';
import { ToursRepository } from './tours.repository';

@Injectable()
export class ToursService {
  constructor(
    private readonly repo: ToursRepository,
    private readonly destinations: DestinationsService,
  ) {}

  async create(operatorId: string, dto: CreateTourDto): Promise<Tour> {
    await this.destinations.findOne(dto.destinationId); // 404 if unknown
    const slug = `${this.slugify(dto.title)}-${randomBytes(3).toString('hex')}`;
    return this.repo.save(
      this.repo.create({
        ...dto,
        operatorId,
        slug,
        currency: 'GHS',
        status: TourStatus.DRAFT,
      }),
    );
  }

  async search(q: TourQueryDto): Promise<Paginated<Tour>> {
    const { skip, take } = applyPagination(q);
    const [data, total] = await this.repo.searchApproved(q, skip, take);
    return paginate(data, total, q);
  }

  async findBySlug(slug: string): Promise<Tour> {
    const tour = await this.repo.findBySlug(slug);
    if (!tour || tour.status !== TourStatus.APPROVED) {
      throw new NotFoundException(`Tour ${slug} not found`);
    }
    return tour;
  }

  async update(
    id: string,
    operatorId: string,
    dto: UpdateTourDto,
  ): Promise<Tour> {
    const tour = await this.owned(id, operatorId);
    Object.assign(tour, dto);
    return this.repo.save(tour);
  }

  async submit(id: string, operatorId: string): Promise<Tour> {
    const tour = await this.owned(id, operatorId);
    if (tour.status !== TourStatus.DRAFT) {
      throw new BadRequestException('Only a draft can be submitted');
    }
    tour.status = TourStatus.PENDING_REVIEW;
    return this.repo.save(tour);
  }

  async approve(id: string): Promise<Tour> {
    const tour = await this.byIdOrThrow(id);
    if (tour.status !== TourStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        'Only a tour pending review can be approved',
      );
    }
    tour.status = TourStatus.APPROVED;
    return this.repo.save(tour);
  }

  async suspend(id: string): Promise<Tour> {
    const tour = await this.byIdOrThrow(id);
    tour.status = TourStatus.SUSPENDED;
    return this.repo.save(tour);
  }

  /** Grounding for the itinerary planner: approved tours for a destination. */
  findItineraryCandidates(
    destination: string,
    limit = 20,
  ): Promise<CandidateTour[]> {
    return this.repo.findApprovedByDestinationName(destination, limit);
  }

  /** Resolver for OwnershipGuard. */
  async ownerIdFor(tourId: string): Promise<string | null> {
    const tour = await this.repo.findById(tourId);
    return tour?.operatorId ?? null;
  }

  /** Used by the bookings module to price a booking and confirm the tour is sellable. */
  async findApprovedForDeparture(
    tourId: string,
    manager?: EntityManager,
  ): Promise<Tour> {
    const tour = await this.repo.findOneApproved(tourId, manager);
    if (!tour) {
      throw new BadRequestException('Tour is not available for booking');
    }
    return tour;
  }

  /** Recompute a tour's rating rollup inside a transaction (Task 9). */
  async applyRating(
    tourId: string,
    rating: number,
    manager: EntityManager,
  ): Promise<void> {
    const repo = manager.getRepository(Tour);
    const tour = await repo.findOneOrFail({ where: { id: tourId } });
    const newCount = tour.ratingCount + 1;
    tour.ratingAvg = (tour.ratingAvg * tour.ratingCount + rating) / newCount;
    tour.ratingCount = newCount;
    await repo.save(tour);
  }

  /** Load a tour and assert the given operator owns it (404 then 403). */
  async assertOwnedBy(id: string, operatorId: string): Promise<Tour> {
    const tour = await this.byIdOrThrow(id);
    if (tour.operatorId !== operatorId) {
      throw new ForbiddenException('Not the tour owner');
    }
    return tour;
  }

  private owned(id: string, operatorId: string): Promise<Tour> {
    return this.assertOwnedBy(id, operatorId);
  }

  private async byIdOrThrow(id: string): Promise<Tour> {
    const tour = await this.repo.findById(id);
    if (!tour) throw new NotFoundException(`Tour ${id} not found`);
    return tour;
  }

  private slugify(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
