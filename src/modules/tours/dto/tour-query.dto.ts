import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class TourQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() destinationId?: string;

  @ApiPropertyOptional({ description: 'Min price in pesewas' })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Max price in pesewas' })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
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
