import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsPositive,
} from 'class-validator';
import { FacilityType } from '../entities/medical-facility.entity';

export class FacilityQueryDto {
  @ApiPropertyOptional({ example: 5.55 })
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  lat?: number;

  @ApiPropertyOptional({ example: -0.196 })
  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  lng?: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Filter to within this radius (km)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  radiusKm?: number;

  @ApiPropertyOptional({ enum: FacilityType })
  @IsOptional()
  @IsEnum(FacilityType)
  type?: FacilityType;

  @ApiPropertyOptional({ example: 'GH' })
  @IsOptional()
  country?: string;
}
