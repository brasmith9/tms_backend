import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { pesewasToCedis } from '../../../common/money';
import {
  MenuSection,
  OpeningHour,
  Restaurant,
} from '../entities/restaurant.entity';

export class RestaurantResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() name!: string;
  @ApiProperty() cuisine!: string;
  @ApiProperty({ example: 2, description: '1–4 (₵–₵₵₵₵)' }) priceTier!: number;
  @ApiProperty() lat!: number;
  @ApiProperty() lng!: number;
  @ApiPropertyOptional() distanceKm?: number;
  @ApiProperty() ratingAvg!: number;
  @ApiProperty() ratingCount!: number;
  @ApiProperty({ type: [String] }) dietary!: string[];
  @ApiProperty() isOpenNow!: boolean;
  @ApiProperty({ required: false }) heroImageUrl?: string;
  @ApiProperty({ type: [String] }) images!: string[];
  @ApiProperty() description!: string;
  @ApiProperty({ type: 'array', items: { type: 'object' } })
  openingHours!: OpeningHour[];

  static from(
    r: Restaurant,
    isOpenNow: boolean,
    distanceKm?: number,
  ): RestaurantResponseDto {
    const dto = new RestaurantResponseDto();
    dto.id = r.id;
    dto.slug = r.slug;
    dto.name = r.name;
    dto.cuisine = r.cuisine;
    dto.priceTier = r.priceTier;
    dto.lat = r.lat;
    dto.lng = r.lng;
    dto.distanceKm =
      distanceKm === undefined ? undefined : Math.round(distanceKm * 10) / 10;
    dto.ratingAvg = r.ratingAvg;
    dto.ratingCount = r.ratingCount;
    dto.dietary = r.dietary;
    dto.isOpenNow = isOpenNow;
    dto.heroImageUrl = r.heroImageUrl;
    dto.images = r.images;
    dto.description = r.description;
    dto.openingHours = r.openingHours;
    return dto;
  }
}

/** Menu with prices mapped to decimal cedis. */
export class MenuResponseDto {
  @ApiProperty({ type: 'array', items: { type: 'object' } })
  sections!: {
    category: string;
    items: { name: string; description?: string; price: number }[];
  }[];

  static from(menu: MenuSection[]): MenuResponseDto {
    const dto = new MenuResponseDto();
    dto.sections = menu.map((s) => ({
      category: s.category,
      items: s.items.map((i) => ({
        name: i.name,
        description: i.description,
        price: pesewasToCedis(i.priceMinor),
      })),
    }));
    return dto;
  }
}
