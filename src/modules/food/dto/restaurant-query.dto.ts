import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class RestaurantQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description:
      'Search name/cuisine/description, and the name of the campus landmark ' +
      'the joint sits by',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    description: 'Only joints attached to this campus location',
  })
  @IsOptional()
  @IsUUID()
  nearestLocationId?: string;

  @ApiPropertyOptional({
    description: 'Only joints attached to the campus location with this slug',
    example: 'commonwealth-hall',
  })
  @IsOptional()
  @IsString()
  nearestLocationSlug?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() cuisine?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  priceTier?: number;

  @ApiPropertyOptional({
    enum: ['VEGETARIAN', 'VEGAN', 'HALAL', 'GLUTEN_FREE'],
  })
  @IsOptional()
  @IsIn(['VEGETARIAN', 'VEGAN', 'HALAL', 'GLUTEN_FREE'])
  dietary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  lat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  lng?: number;

  @ApiPropertyOptional({ description: 'Only restaurants open now' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  openNow?: boolean;
}
