import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  FacilityType,
  MedicalFacility,
} from '../entities/medical-facility.entity';

export class FacilityResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: FacilityType }) type!: FacilityType;
  @ApiProperty() description!: string;
  @ApiProperty() lat!: number;
  @ApiProperty() lng!: number;
  @ApiProperty() phone!: string;
  @ApiProperty() open24h!: boolean;
  @ApiPropertyOptional({
    description: 'Present when the query included lat/lng',
  })
  distanceKm?: number;

  static from(f: MedicalFacility, distanceKm?: number): FacilityResponseDto {
    const dto = new FacilityResponseDto();
    dto.id = f.id;
    dto.name = f.name;
    dto.type = f.type;
    dto.description = f.description;
    dto.lat = f.lat;
    dto.lng = f.lng;
    dto.phone = f.phone;
    dto.open24h = f.open24h;
    dto.distanceKm =
      distanceKm === undefined ? undefined : Math.round(distanceKm * 10) / 10;
    return dto;
  }
}
