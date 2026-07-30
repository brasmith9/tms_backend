import { ApiProperty } from '@nestjs/swagger';
import { Destination } from '../entities/destination.entity';

export class DestinationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() region!: string;
  @ApiProperty() country!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ required: false }) heroImageUrl?: string;
  @ApiProperty({ required: false }) lat?: number;
  @ApiProperty({ required: false }) lng?: number;

  static from(d: Destination): DestinationResponseDto {
    const dto = new DestinationResponseDto();
    dto.id = d.id;
    dto.name = d.name;
    dto.region = d.region;
    dto.country = d.country;
    dto.description = d.description;
    dto.heroImageUrl = d.heroImageUrl;
    dto.lat = d.lat;
    dto.lng = d.lng;
    return dto;
  }
}
