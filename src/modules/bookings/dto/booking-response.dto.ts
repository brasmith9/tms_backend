import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus, TourBooking } from '../entities/tour-booking.entity';

export class BookingResponseDto {
  @ApiProperty({ example: 'TUR-2026-0007' }) reference!: string;
  @ApiProperty() departureId!: string;
  @ApiProperty() seats!: number;
  @ApiProperty({ example: 24000 }) totalMinor!: number;
  @ApiProperty({ example: 'GHS' }) currency!: string;
  @ApiProperty({ enum: BookingStatus }) status!: BookingStatus;
  @ApiProperty() createdAt!: Date;

  static from(b: TourBooking): BookingResponseDto {
    const dto = new BookingResponseDto();
    dto.reference = b.reference;
    dto.departureId = b.departureId;
    dto.seats = b.seats;
    dto.totalMinor = b.totalMinor;
    dto.currency = b.currency;
    dto.status = b.status;
    dto.createdAt = b.createdAt;
    return dto;
  }
}
