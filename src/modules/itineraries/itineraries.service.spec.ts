import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CandidateTour } from '../tours/candidate-tour';
import { ToursService } from '../tours/tours.service';
import { Itinerary } from './entities/itinerary.entity';
import { ItinerariesRepository } from './itineraries.repository';
import { ItinerariesService } from './itineraries.service';
import {
  ITINERARY_PLANNER,
  ItineraryPlan,
  PlannerResult,
} from './itinerary-planner.port';

const CANDIDATE: CandidateTour = {
  id: 'tour-1',
  slug: 'kakum-canopy-walk',
  title: 'Kakum Canopy Walk',
  destinationName: 'Cape Coast',
  priceMinor: 12000,
  durationMinutes: 180,
};

function planWith(
  ...items: ItineraryPlan['days'][number]['items']
): PlannerResult {
  return {
    title: 'Cape Coast in 1 day',
    model: 'test-model',
    plan: {
      summary: 'A day in Cape Coast',
      days: [{ day: 1, title: 'Day 1', items }],
    },
  };
}

describe('ItinerariesService', () => {
  let service: ItinerariesService;
  let repo: Record<string, jest.Mock>;
  let tours: Record<string, jest.Mock>;
  let planner: { plan: jest.Mock };

  beforeEach(async () => {
    repo = {
      create: jest.fn((input: Partial<Itinerary>) => input),
      save: jest.fn((i: Itinerary) => Promise.resolve({ id: 'it-1', ...i })),
      findByIdAndUser: jest.fn(),
      findAndCountByUser: jest.fn(),
      remove: jest.fn(),
    };
    tours = {
      findItineraryCandidates: jest.fn().mockResolvedValue([CANDIDATE]),
    };
    planner = { plan: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        ItinerariesService,
        { provide: ItinerariesRepository, useValue: repo },
        { provide: ToursService, useValue: tours },
        { provide: ITINERARY_PLANNER, useValue: planner },
      ],
    }).compile();
    service = module.get(ItinerariesService);
  });

  it('grounds the planner with candidate tours for the destination', async () => {
    planner.plan.mockResolvedValue(planWith());
    await service.generate('user-1', { destination: 'Cape Coast', days: 1 });
    expect(tours.findItineraryCandidates).toHaveBeenCalledWith(
      'Cape Coast',
      20,
    );
    expect(planner.plan).toHaveBeenCalledWith(
      expect.objectContaining({
        destination: 'Cape Coast',
        days: 1,
        partySize: 1,
        interests: [],
        candidateTours: [CANDIDATE],
      }),
    );
  });

  it('keeps a TOUR item whose tourId is a real candidate, marked bookable', async () => {
    planner.plan.mockResolvedValue(
      planWith({
        period: 'morning',
        kind: 'TOUR',
        title: 'Canopy walk',
        description: 'Walk the canopy',
        tourId: 'tour-1',
        bookable: false,
      }),
    );
    const saved = await service.generate('user-1', {
      destination: 'Cape Coast',
      days: 1,
    });
    const item = saved.plan.days[0].items[0];
    expect(item.kind).toBe('TOUR');
    expect(item.bookable).toBe(true);
    expect(item.tourId).toBe('tour-1');
    expect(item.tourSlug).toBe('kakum-canopy-walk');
  });

  it('downgrades a TOUR item with a hallucinated tourId to a non-bookable tip', async () => {
    planner.plan.mockResolvedValue(
      planWith({
        period: 'morning',
        kind: 'TOUR',
        title: 'Invented tour',
        description: 'Not real',
        tourId: 'does-not-exist',
        bookable: true,
      }),
    );
    const saved = await service.generate('user-1', {
      destination: 'Cape Coast',
      days: 1,
    });
    const item = saved.plan.days[0].items[0];
    expect(item.kind).toBe('TIP');
    expect(item.bookable).toBe(false);
    expect(item.tourId).toBeUndefined();
  });

  it('persists the resolved model and echoed request fields', async () => {
    planner.plan.mockResolvedValue(planWith());
    await service.generate('user-1', {
      destination: 'Cape Coast',
      days: 2,
      budgetMinor: 3000.5,
      partySize: 3,
      interests: ['history'],
    });
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        title: 'Cape Coast in 1 day',
        destinationName: 'Cape Coast',
        days: 2,
        budgetMinor: 300050,
        partySize: 3,
        interests: ['history'],
        model: 'test-model',
      }),
    );
  });

  it('still generates an all-non-bookable plan when no tours match', async () => {
    tours.findItineraryCandidates.mockResolvedValue([]);
    planner.plan.mockResolvedValue(
      planWith({
        period: 'morning',
        kind: 'FREE',
        title: 'Beach time',
        description: 'Relax',
        bookable: false,
      }),
    );
    const saved = await service.generate('user-1', {
      destination: 'Nowhere',
      days: 1,
    });
    expect(saved.plan.days[0].items[0].bookable).toBe(false);
  });

  it('returns the owning userId for a found itinerary and 404s when missing', async () => {
    repo.findByIdAndUser.mockResolvedValueOnce({
      id: 'it-1',
      userId: 'user-1',
    });
    await expect(service.findOneForUser('it-1', 'user-1')).resolves.toEqual(
      expect.objectContaining({ id: 'it-1' }),
    );
    repo.findByIdAndUser.mockResolvedValueOnce(null);
    await expect(service.findOneForUser('it-x', 'user-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('lists my itineraries paginated', async () => {
    repo.findAndCountByUser.mockResolvedValue([[{ id: 'it-1' }], 1]);
    const q = Object.assign(new PaginationQueryDto(), { page: 1, limit: 20 });
    const page = await service.findMine('user-1', q);
    expect(page.total).toBe(1);
    expect(page.results).toHaveLength(1);
  });
});
