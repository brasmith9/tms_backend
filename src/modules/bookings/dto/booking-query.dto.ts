import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export type BookingTab = 'upcoming' | 'completed' | 'cancelled';

export class BookingQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['upcoming', 'completed', 'cancelled'] })
  @IsOptional()
  @IsIn(['upcoming', 'completed', 'cancelled'])
  status?: BookingTab;
}
