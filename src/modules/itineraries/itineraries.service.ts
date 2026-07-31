import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { cedisToPesewas } from '../../common/money';
import {
  Paginated,
  applyPagination,
  paginate,
} from '../../common/pagination/paginate';
import { CandidateTour } from '../tours/candidate-tour';
import { ToursService } from '../tours/tours.service';
import { GenerateItineraryDto } from './dto/generate-itinerary.dto';
import { Itinerary } from './entities/itinerary.entity';
import { ItinerariesRepository } from './itineraries.repository';
import { ITINERARY_PLANNER } from './itinerary-planner.port';
import type {
  ItineraryPlan,
  ItineraryPlannerPort,
  PlanItem,
} from './itinerary-planner.port';

const CANDIDATE_LIMIT = 20;

@Injectable()
export class ItinerariesService {
  constructor(
    private readonly repo: ItinerariesRepository,
    private readonly tours: ToursService,
    @Inject(ITINERARY_PLANNER)
    private readonly planner: ItineraryPlannerPort,
  ) {}

  async generate(
    userId: string,
    dto: GenerateItineraryDto,
  ): Promise<Itinerary> {
    const partySize = dto.partySize ?? 1;
    const interests = dto.interests ?? [];
    const candidateTours = await this.tours.findItineraryCandidates(
      dto.destination,
      CANDIDATE_LIMIT,
    );

    const result = await this.planner.plan({
      destination: dto.destination,
      days: dto.days,
      budgetMinor:
        dto.budgetMinor === undefined
          ? undefined
          : cedisToPesewas(dto.budgetMinor),
      partySize,
      interests,
      candidateTours,
    });

    const plan = this.sanitizePlan(result.plan, candidateTours);

    return this.repo.save(
      this.repo.create({
        userId,
        title: result.title,
        destinationName: dto.destination,
        days: dto.days,
        budgetMinor:
          dto.budgetMinor === undefined
            ? null
            : cedisToPesewas(dto.budgetMinor),
        partySize,
        interests,
        plan,
        model: result.model,
      }),
    );
  }

  async findMine(
    userId: string,
    q: PaginationQueryDto,
  ): Promise<Paginated<Itinerary>> {
    const { skip, take } = applyPagination(q);
    const [data, total] = await this.repo.findAndCountByUser(
      userId,
      skip,
      take,
    );
    return paginate(data, total, q);
  }

  async findOneForUser(id: string, userId: string): Promise<Itinerary> {
    const itinerary = await this.repo.findByIdAndUser(id, userId);
    if (!itinerary) throw new NotFoundException(`Itinerary ${id} not found`);
    return itinerary;
  }

  async removeForUser(id: string, userId: string): Promise<void> {
    await this.repo.remove(await this.findOneForUser(id, userId));
  }

  /**
   * Re-grounds the model's output against reality: every TOUR item must point at
   * a tour that was actually offered as a candidate. Hallucinated ids are
   * downgraded to non-bookable tips so nothing un-bookable is surfaced as bookable.
   */
  private sanitizePlan(
    plan: ItineraryPlan,
    candidates: CandidateTour[],
  ): ItineraryPlan {
    const byId = new Map(candidates.map((c) => [c.id, c]));
    return {
      summary: plan.summary ?? '',
      estimatedTotalMinor: plan.estimatedTotalMinor,
      notes: plan.notes,
      days: (plan.days ?? []).map((d) => ({
        day: d.day,
        title: d.title,
        items: (d.items ?? []).map((item) => this.sanitizeItem(item, byId)),
      })),
    };
  }

  private sanitizeItem(
    item: PlanItem,
    byId: Map<string, CandidateTour>,
  ): PlanItem {
    const candidate = item.tourId ? byId.get(item.tourId) : undefined;
    if (item.kind === 'TOUR' && candidate) {
      return {
        period: item.period,
        kind: 'TOUR',
        title: item.title || candidate.title,
        description: item.description ?? '',
        tourId: candidate.id,
        tourSlug: candidate.slug,
        estimatedCostMinor: item.estimatedCostMinor ?? candidate.priceMinor,
        bookable: true,
      };
    }
    return {
      period: item.period,
      kind: item.kind === 'TOUR' ? 'TIP' : item.kind,
      title: item.title,
      description: item.description ?? '',
      estimatedCostMinor: item.estimatedCostMinor,
      bookable: false,
    };
  }
}
