import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class TourQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Free-text search over title/description',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID() destinationId?: string;

  @ApiPropertyOptional({ description: 'Min price in GHS', example: 150.5 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Max price in GHS', example: 300 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({
    example: '-price',
    description: 'price | -price | title',
  })
  @IsOptional()
  @IsString()
  sort?: string;
}
