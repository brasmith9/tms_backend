import { ApiProperty } from '@nestjs/swagger';
import { Tour, TourStatus } from '../entities/tour.entity';

export class TourResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() operatorId!: string;
  @ApiProperty() destinationId!: string;
  @ApiProperty() title!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ example: 12000 }) priceMinor!: number;
  @ApiProperty({ example: 'GHS' }) currency!: string;
  @ApiProperty() durationMinutes!: number;
  @ApiProperty({ enum: TourStatus }) status!: TourStatus;
  @ApiProperty({ required: false }) heroImageUrl?: string;
  @ApiProperty() ratingAvg!: number;
  @ApiProperty() ratingCount!: number;

  static from(t: Tour): TourResponseDto {
    const dto = new TourResponseDto();
    dto.id = t.id;
    dto.operatorId = t.operatorId;
    dto.destinationId = t.destinationId;
    dto.title = t.title;
    dto.slug = t.slug;
    dto.description = t.description;
    dto.priceMinor = t.priceMinor;
    dto.currency = t.currency;
    dto.durationMinutes = t.durationMinutes;
    dto.status = t.status;
    dto.heroImageUrl = t.heroImageUrl;
    dto.ratingAvg = t.ratingAvg;
    dto.ratingCount = t.ratingCount;
    return dto;
  }
}
