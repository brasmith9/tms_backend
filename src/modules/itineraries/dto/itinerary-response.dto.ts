import { ApiProperty } from '@nestjs/swagger';
import { pesewasToCedis } from '../../../common/money';
import { Itinerary } from '../entities/itinerary.entity';
import type {
  ItineraryPlan,
  PlanDay,
  PlanItem,
} from '../itinerary-planner.port';

/** The plan as clients see it: costs in decimal GHS rather than pesewas. */
type ResponsePlanItem = Omit<PlanItem, 'estimatedCostMinor'> & {
  estimatedCost?: number;
};
type ResponsePlanDay = Omit<PlanDay, 'items'> & { items: ResponsePlanItem[] };
type ResponsePlan = Omit<ItineraryPlan, 'estimatedTotalMinor' | 'days'> & {
  estimatedTotal?: number;
  days: ResponsePlanDay[];
};

function planToCedis(plan: ItineraryPlan): ResponsePlan {
  const { estimatedTotalMinor, days, ...rest } = plan;
  return {
    ...rest,
    estimatedTotal:
      estimatedTotalMinor === undefined
        ? undefined
        : pesewasToCedis(estimatedTotalMinor),
    days: days.map((d) => ({
      ...d,
      items: d.items.map(({ estimatedCostMinor, ...item }) => ({
        ...item,
        estimatedCost:
          estimatedCostMinor === undefined
            ? undefined
            : pesewasToCedis(estimatedCostMinor),
      })),
    })),
  };
}

export class ItineraryResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() destinationName!: string;
  @ApiProperty({ example: 3 }) days!: number;
  @ApiProperty({
    required: false,
    example: 2000.5,
    description: 'Budget in GHS',
  })
  budget?: number;
  @ApiProperty({ example: 2 }) partySize!: number;
  @ApiProperty({ type: [String], example: ['history', 'beaches'] })
  interests!: string[];
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'Structured day-by-day plan (see plan schema)',
  })
  plan!: ResponsePlan;
  @ApiProperty({ example: 'anthropic/claude-3.5-sonnet' }) model!: string;
  @ApiProperty() createdAt!: Date;

  static from(i: Itinerary): ItineraryResponseDto {
    const dto = new ItineraryResponseDto();
    dto.id = i.id;
    dto.title = i.title;
    dto.destinationName = i.destinationName;
    dto.days = i.days;
    dto.budget =
      i.budgetMinor === null || i.budgetMinor === undefined
        ? undefined
        : pesewasToCedis(i.budgetMinor);
    dto.partySize = i.partySize;
    dto.interests = i.interests;
    dto.plan = planToCedis(i.plan);
    dto.model = i.model;
    dto.createdAt = i.createdAt;
    return dto;
  }
}
