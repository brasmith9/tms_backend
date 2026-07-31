import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { Favorite, FavoriteType } from '../entities/favorite.entity';
import type { FavoriteSnapshot } from '../entities/favorite.entity';

export class CreateFavoriteDto {
  @ApiProperty({ enum: FavoriteType })
  @IsEnum(FavoriteType)
  type!: FavoriteType;

  @ApiProperty({ description: 'Id of the tour/stay/restaurant/destination' })
  @IsUUID()
  itemId!: string;
}

export class FavoriteQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: FavoriteType })
  @IsOptional()
  @IsEnum(FavoriteType)
  type?: FavoriteType;
}

export class FavoriteResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: FavoriteType }) type!: FavoriteType;
  @ApiProperty() itemId!: string;
  @ApiProperty({ type: 'object', additionalProperties: true })
  item!: FavoriteSnapshot;
  @ApiProperty() createdAt!: Date;

  static from(f: Favorite): FavoriteResponseDto {
    const dto = new FavoriteResponseDto();
    dto.id = f.id;
    dto.type = f.type;
    dto.itemId = f.itemId;
    dto.item = f.snapshot;
    dto.createdAt = f.createdAt;
    return dto;
  }
}
