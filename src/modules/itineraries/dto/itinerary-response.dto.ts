import { ApiProperty } from '@nestjs/swagger';
import { Itinerary } from '../entities/itinerary.entity';
import type { ItineraryPlan } from '../itinerary-planner.port';

export class ItineraryResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() destinationName!: string;
  @ApiProperty({ example: 3 }) days!: number;
  @ApiProperty({ required: false, example: 200000 }) budgetMinor?: number;
  @ApiProperty({ example: 2 }) partySize!: number;
  @ApiProperty({ type: [String], example: ['history', 'beaches'] })
  interests!: string[];
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'Structured day-by-day plan (see plan schema)',
  })
  plan!: ItineraryPlan;
  @ApiProperty({ example: 'anthropic/claude-3.5-sonnet' }) model!: string;
  @ApiProperty() createdAt!: Date;

  static from(i: Itinerary): ItineraryResponseDto {
    const dto = new ItineraryResponseDto();
    dto.id = i.id;
    dto.title = i.title;
    dto.destinationName = i.destinationName;
    dto.days = i.days;
    dto.budgetMinor = i.budgetMinor ?? undefined;
    dto.partySize = i.partySize;
    dto.interests = i.interests;
    dto.plan = i.plan;
    dto.model = i.model;
    dto.createdAt = i.createdAt;
    return dto;
  }
}
