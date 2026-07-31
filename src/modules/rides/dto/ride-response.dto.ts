import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { pesewasToCedis } from '../../../common/money';
import { Driver } from '../entities/driver.entity';
import { Ride } from '../entities/ride.entity';
import { RideQuote } from '../entities/ride-quote.entity';
import { RideStatus, VehicleType } from '../ride.types';
import type { GeoPoint } from '../ride.types';

export class QuoteResponseDto {
  @ApiProperty() quoteId!: string;
  @ApiProperty({ description: 'Fare in GHS' }) fare!: number;
  @ApiProperty() currency!: string;
  @ApiProperty() etaMinutes!: number;
  @ApiProperty({ example: 1 }) surgeMultiplier!: number;
  @ApiProperty() expiresAt!: string;

  static from(q: RideQuote): QuoteResponseDto {
    const dto = new QuoteResponseDto();
    dto.quoteId = q.id;
    dto.fare = pesewasToCedis(q.fareMinor);
    dto.currency = q.currency;
    dto.etaMinutes = q.etaMinutes;
    dto.surgeMultiplier = q.surgeMultiplier;
    dto.expiresAt = q.expiresAt.toISOString();
    return dto;
  }
}

export class NearbyDriverDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() rating!: number;
  @ApiProperty() etaMinutes!: number;
  @ApiProperty() lat!: number;
  @ApiProperty() lng!: number;
  @ApiProperty({ type: 'object', additionalProperties: true })
  vehicle!: { make: string; model: string; plate: string; color: string };

  static from(d: Driver, etaMinutes: number): NearbyDriverDto {
    const dto = new NearbyDriverDto();
    dto.id = d.id;
    dto.name = d.name;
    dto.rating = d.rating;
    dto.etaMinutes = etaMinutes;
    dto.lat = d.lat;
    dto.lng = d.lng;
    dto.vehicle = {
      make: d.vehicleMake,
      model: d.vehicleModel,
      plate: d.vehiclePlate,
      color: d.vehicleColor,
    };
    return dto;
  }
}

export class RideResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: RideStatus }) status!: RideStatus;
  @ApiProperty({ enum: VehicleType }) vehicleType!: VehicleType;
  @ApiProperty({ type: 'object', additionalProperties: true })
  pickup!: GeoPoint;
  @ApiProperty({ type: 'object', additionalProperties: true })
  dropoff!: GeoPoint;
  @ApiProperty({ description: 'Fare in GHS' }) fare!: number;
  @ApiProperty() currency!: string;
  @ApiPropertyOptional() etaMinutes?: number;
  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Assigned driver (masked phone for tel:)',
  })
  driver?: {
    id: string;
    name: string;
    phone: string;
    rating: number;
    vehicle: { make: string; model: string; plate: string; color: string };
  };
  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  driverLocation?: { lat: number; lng: number };
  @ApiProperty() createdAt!: Date;

  static from(ride: Ride, driver?: Driver | null): RideResponseDto {
    const dto = new RideResponseDto();
    dto.id = ride.id;
    dto.status = ride.status;
    dto.vehicleType = ride.vehicleType;
    dto.pickup = ride.pickup;
    dto.dropoff = ride.dropoff;
    dto.fare = pesewasToCedis(ride.fareMinor);
    dto.currency = ride.currency;
    dto.etaMinutes = ride.etaMinutes;
    if (driver) {
      dto.driver = {
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        rating: driver.rating,
        vehicle: {
          make: driver.vehicleMake,
          model: driver.vehicleModel,
          plate: driver.vehiclePlate,
          color: driver.vehicleColor,
        },
      };
    }
    if (ride.driverLat !== undefined && ride.driverLat !== null) {
      dto.driverLocation = { lat: ride.driverLat, lng: ride.driverLng! };
    }
    dto.createdAt = ride.createdAt;
    return dto;
  }
}
