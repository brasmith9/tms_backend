import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Location, LocationCategory } from '../entities/location.entity';

export class LocationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: LocationCategory }) category!: LocationCategory;
  @ApiPropertyOptional() description?: string;
  @ApiProperty() lat!: number;
  @ApiProperty() lng!: number;
  @ApiProperty({ type: [String] }) photos!: string[];
  @ApiPropertyOptional() buildingNotes?: string;
  @ApiPropertyOptional({
    description: 'Only present when lat/lng query params were supplied',
  })
  distanceKm?: number;

  static from(l: Location, distanceKm?: number): LocationResponseDto {
    const dto = new LocationResponseDto();
    dto.id = l.id;
    dto.slug = l.slug;
    dto.name = l.name;
    dto.category = l.category;
    dto.description = l.description;
    dto.lat = l.lat;
    dto.lng = l.lng;
    dto.photos = l.photos;
    dto.buildingNotes = l.buildingNotes;
    dto.distanceKm =
      distanceKm === undefined ? undefined : Math.round(distanceKm * 100) / 100;
    return dto;
  }
}
