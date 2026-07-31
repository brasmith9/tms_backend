import { ItineraryResponseDto } from './itinerary-response.dto';
import { Itinerary } from '../entities/itinerary.entity';

function itinerary(over: Partial<Itinerary> = {}): Itinerary {
  return {
    id: 'i1',
    userId: 'u1',
    title: 'Cape Coast in 2 days',
    destinationName: 'Cape Coast',
    days: 2,
    budgetMinor: 300050,
    partySize: 2,
    interests: ['history'],
    model: 'test-model',
    createdAt: new Date('2026-07-31T00:00:00.000Z'),
    plan: {
      summary: 's',
      estimatedTotalMinor: 15050,
      days: [
        {
          day: 1,
          title: 'Day 1',
          items: [
            {
              period: 'morning',
              kind: 'TOUR',
              title: 'Castle',
              description: 'd',
              estimatedCostMinor: 12000,
              bookable: true,
            },
            {
              period: 'evening',
              kind: 'FREE',
              title: 'Rest',
              description: 'd',
              bookable: false,
            },
          ],
        },
      ],
    },
    ...over,
  };
}

describe('ItineraryResponseDto', () => {
  it('exposes the budget in decimal cedis', () => {
    expect(ItineraryResponseDto.from(itinerary()).budget).toBe(3000.5);
  });

  it('omits the budget when unset', () => {
    expect(
      ItineraryResponseDto.from(itinerary({ budgetMinor: null })).budget,
    ).toBeUndefined();
  });

  it('converts plan costs to decimal cedis', () => {
    const plan = ItineraryResponseDto.from(itinerary()).plan;
    expect(plan.estimatedTotal).toBe(150.5);
    expect(plan.days[0].items[0].estimatedCost).toBe(120);
  });

  it('leaves an item without a cost undefined', () => {
    const plan = ItineraryResponseDto.from(itinerary()).plan;
    expect(plan.days[0].items[1].estimatedCost).toBeUndefined();
  });

  it('drops the pesewa-denominated keys from the response', () => {
    const plan = ItineraryResponseDto.from(itinerary()).plan as unknown as {
      estimatedTotalMinor?: number;
      days: { items: { estimatedCostMinor?: number }[] }[];
    };
    expect(plan.estimatedTotalMinor).toBeUndefined();
    expect(plan.days[0].items[0].estimatedCostMinor).toBeUndefined();
  });

  it('preserves non-money plan fields', () => {
    const plan = ItineraryResponseDto.from(itinerary()).plan;
    expect(plan.summary).toBe('s');
    expect(plan.days[0].items[0].bookable).toBe(true);
    expect(plan.days[0].items[0].title).toBe('Castle');
  });
});
