import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { BookingItem } from '../booking-item';
import { BookingStatus, TourBooking } from '../entities/tour-booking.entity';

export class BookingResponseDto {
  @ApiProperty({ example: 'TUR-2026-0007' }) reference!: string;
  @ApiProperty() departureId!: string;
  @ApiProperty() seats!: number;
  @ApiProperty({ example: 24000 }) totalMinor!: number;
  @ApiProperty({ example: 'GHS' }) currency!: string;
  @ApiProperty({ enum: BookingStatus }) status!: BookingStatus;
  @ApiProperty() createdAt!: Date;
  @ApiPropertyOptional({
    description: 'Summary of the booked tour, for rendering trips lists',
    example: {
      id: 'a1b2',
      slug: 'kakum-canopy-walk',
      title: 'Kakum Canopy Walk',
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/kakum.jpg',
      startsAt: '2026-08-25T08:30:00.000Z',
    },
  })
  item?: BookingItem;

  static from(b: TourBooking, item?: BookingItem | null): BookingResponseDto {
    const dto = new BookingResponseDto();
    dto.reference = b.reference;
    dto.departureId = b.departureId;
    dto.seats = b.seats;
    dto.totalMinor = b.totalMinor;
    dto.currency = b.currency;
    dto.status = b.status;
    dto.createdAt = b.createdAt;
    dto.item = item ?? undefined;
    return dto;
  }
}
