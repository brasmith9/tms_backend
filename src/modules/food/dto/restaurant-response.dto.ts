import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { pesewasToCedis } from '../../../common/money';
import {
  MenuSection,
  OpeningHour,
  Restaurant,
} from '../entities/restaurant.entity';

/** The campus landmark a joint sits by, denormalised for rendering. */
export class NearestLocationDto {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() name!: string;
}

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

  @ApiPropertyOptional({ type: NearestLocationDto })
  nearestLocation?: NearestLocationDto;

  @ApiProperty({
    description:
      'Whether the vendor consented to publishing their contact details. ' +
      'When false, phone/whatsapp/email are omitted entirely.',
  })
  contactConsent!: boolean;

  @ApiPropertyOptional({
    description: 'Present only when contactConsent is true',
  })
  phone?: string;
  @ApiPropertyOptional({
    description: 'Present only when contactConsent is true',
  })
  whatsapp?: string;
  @ApiPropertyOptional({
    description: 'Present only when contactConsent is true',
  })
  email?: string;

  static from(
    r: Restaurant,
    isOpenNow: boolean,
    distanceKm?: number,
    nearestLocation?: NearestLocationDto,
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
    dto.nearestLocation = nearestLocation;

    // Consent gate: without an explicit opt-in the contact fields never leave
    // the process, whatever is stored on the row.
    dto.contactConsent = r.contactConsent;
    if (r.contactConsent) {
      // `?? undefined` so an unset column is omitted rather than serialized as
      // null — these are declared optional, and `"email": null` reads like a
      // published-but-empty address.
      dto.phone = r.phone ?? undefined;
      dto.whatsapp = r.whatsapp ?? undefined;
      dto.email = r.email ?? undefined;
    }
    return dto;
  }
}

/** Menu with prices mapped to decimal cedis. */
export class MenuResponseDto {
  @ApiProperty({ type: 'array', items: { type: 'object' } })
  sections!: {
    category: string;
    items: {
      name: string;
      description?: string;
      price: number;
      photoUrl?: string;
    }[];
  }[];

  static from(menu: MenuSection[]): MenuResponseDto {
    const dto = new MenuResponseDto();
    dto.sections = menu.map((s) => ({
      category: s.category,
      items: s.items.map((i) => ({
        name: i.name,
        description: i.description,
        price: pesewasToCedis(i.priceMinor),
        photoUrl: i.photoUrl,
      })),
    }));
    return dto;
  }
}
