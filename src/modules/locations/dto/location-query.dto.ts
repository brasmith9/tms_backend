import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { LocationCategory } from '../entities/location.entity';

export class LocationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search name and description' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: LocationCategory })
  @IsOptional()
  @IsEnum(LocationCategory)
  category?: LocationCategory;

  @ApiPropertyOptional({ example: 5.6508 })
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  lat?: number;

  @ApiPropertyOptional({ example: -0.1869 })
  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  lng?: number;

  @ApiPropertyOptional({
    description: 'Only locations within this many km of lat/lng',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  radiusKm?: number;
}
