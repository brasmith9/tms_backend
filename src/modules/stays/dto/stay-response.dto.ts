import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { pesewasToCedis } from '../../../common/money';
import { Room } from '../entities/room.entity';
import { Stay, StayCategory } from '../entities/stay.entity';

export class StayResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: StayCategory }) category!: StayCategory;
  @ApiProperty() location!: string;
  @ApiProperty() lat!: number;
  @ApiProperty() lng!: number;
  @ApiPropertyOptional() distanceKm?: number;
  @ApiProperty({ example: 4 }) stars!: number;
  @ApiProperty() ratingAvg!: number;
  @ApiProperty() ratingCount!: number;
  @ApiProperty({ description: 'Cheapest nightly rate in GHS' })
  fromPrice!: number;
  @ApiProperty({ example: 'GHS' }) currency!: string;
  @ApiProperty({ type: [String] }) amenities!: string[];
  @ApiProperty({ type: [String] }) images!: string[];
  @ApiProperty({ required: false }) heroImageUrl?: string;
  @ApiProperty() description!: string;

  static from(s: Stay, distanceKm?: number): StayResponseDto {
    const dto = new StayResponseDto();
    dto.id = s.id;
    dto.slug = s.slug;
    dto.name = s.name;
    dto.category = s.category;
    dto.location = s.location;
    dto.lat = s.lat;
    dto.lng = s.lng;
    dto.distanceKm =
      distanceKm === undefined ? undefined : Math.round(distanceKm * 10) / 10;
    dto.stars = s.stars;
    dto.ratingAvg = s.ratingAvg;
    dto.ratingCount = s.ratingCount;
    dto.fromPrice = pesewasToCedis(s.fromPriceMinor);
    dto.currency = s.currency;
    dto.amenities = s.amenities;
    dto.images = s.images;
    dto.heroImageUrl = s.heroImageUrl;
    dto.description = s.description;
    return dto;
  }
}

export class RoomResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() maxGuests!: number;
  @ApiProperty() bed!: string;
  @ApiProperty({ description: 'Nightly rate in GHS' }) pricePerNight!: number;
  @ApiProperty() available!: boolean;

  static from(r: Room): RoomResponseDto {
    const dto = new RoomResponseDto();
    dto.id = r.id;
    dto.name = r.name;
    dto.maxGuests = r.maxGuests;
    dto.bed = r.bed;
    dto.pricePerNight = pesewasToCedis(r.pricePerNightMinor);
    dto.available = r.available;
    return dto;
  }
}
