import { ApiProperty } from '@nestjs/swagger';
import {
  DepartureStatus,
  TourDeparture,
} from '../entities/tour-departure.entity';

export class DepartureResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tourId!: string;
  @ApiProperty() departsAt!: Date;
  @ApiProperty() capacity!: number;
  @ApiProperty() seatsLeft!: number;
  @ApiProperty({ enum: DepartureStatus }) status!: DepartureStatus;

  static from(d: TourDeparture, seatsLeft: number): DepartureResponseDto {
    const dto = new DepartureResponseDto();
    dto.id = d.id;
    dto.tourId = d.tourId;
    dto.departsAt = d.departsAt;
    dto.capacity = d.capacity;
    dto.seatsLeft = seatsLeft;
    dto.status = d.status;
    return dto;
  }
}
