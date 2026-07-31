import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { pesewasToCedis } from '../../../common/money';
import type { BookingItem } from '../booking-item';
import { TourBooking } from '../entities/tour-booking.entity';
import { Reservation } from '../../reservations/entities/reservation.entity';
import type { ReservationItem } from '../../reservations/entities/reservation.entity';

export type TripItemType = 'TOUR' | 'STAY' | 'FLIGHT' | 'TABLE';

/** Unified trips-list entry across tour bookings and other reservations. */
export class TripResponseDto {
  @ApiProperty({ example: 'TUR-2026-0007' }) reference!: string;
  @ApiProperty({ enum: ['TOUR', 'STAY', 'FLIGHT', 'TABLE'] })
  itemType!: TripItemType;
  @ApiProperty() status!: string;
  @ApiProperty({ description: 'Total in GHS' }) total!: number;
  @ApiProperty({ example: 'GHS' }) currency!: string;
  @ApiProperty() createdAt!: Date;
  @ApiPropertyOptional({ description: 'Display summary of the booked item' })
  item?: BookingItem | ReservationItem;
  @ApiPropertyOptional({ description: 'Tour bookings only' }) departureId?: string;
  @ApiPropertyOptional({ description: 'Tour bookings only' }) seats?: number;

  static fromTour(b: TourBooking, item?: BookingItem): TripResponseDto {
    const dto = new TripResponseDto();
    dto.reference = b.reference;
    dto.itemType = 'TOUR';
    dto.status = b.status;
    dto.total = pesewasToCedis(b.totalMinor);
    dto.currency = b.currency;
    dto.createdAt = b.createdAt;
    dto.item = item;
    dto.departureId = b.departureId;
    dto.seats = b.seats;
    return dto;
  }

  static fromReservation(r: Reservation): TripResponseDto {
    const dto = new TripResponseDto();
    dto.reference = r.reference;
    dto.itemType = r.type;
    dto.status = r.status;
    dto.total = pesewasToCedis(r.totalMinor);
    dto.currency = r.currency;
    dto.createdAt = r.createdAt;
    dto.item = r.item;
    return dto;
  }
}
