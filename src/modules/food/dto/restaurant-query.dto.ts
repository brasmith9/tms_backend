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
  Max,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class RestaurantQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search name/cuisine/description' })
  @IsOptional()
  @IsString()
  q?: string;

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
