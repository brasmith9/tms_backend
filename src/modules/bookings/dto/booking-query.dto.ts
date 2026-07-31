import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export type BookingTab = 'upcoming' | 'completed' | 'cancelled';
export type TripTypeFilter = 'TOUR' | 'STAY' | 'FLIGHT' | 'TABLE';

export class BookingQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['upcoming', 'completed', 'cancelled'] })
  @IsOptional()
  @IsIn(['upcoming', 'completed', 'cancelled'])
  status?: BookingTab;

  @ApiPropertyOptional({
    enum: ['TOUR', 'STAY', 'FLIGHT', 'TABLE'],
    description: 'Filter the unified trips list to one item type',
  })
  @IsOptional()
  @IsIn(['TOUR', 'STAY', 'FLIGHT', 'TABLE'])
  type?: TripTypeFilter;
}
