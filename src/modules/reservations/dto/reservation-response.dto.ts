import { ApiProperty } from '@nestjs/swagger';
import { pesewasToCedis } from '../../../common/money';
import {
  Reservation,
  ReservationStatus,
  ReservationType,
} from '../entities/reservation.entity';
import type { ReservationItem } from '../entities/reservation.entity';

export class ReservationResponseDto {
  @ApiProperty({ example: 'TBL-2026-0001' }) reference!: string;
  @ApiProperty({ enum: ReservationType }) type!: ReservationType;
  @ApiProperty({ enum: ReservationStatus }) status!: ReservationStatus;
  @ApiProperty({ example: 0, description: 'Total in GHS' }) total!: number;
  @ApiProperty({ example: 'GHS' }) currency!: string;
  @ApiProperty({ type: 'object', additionalProperties: true })
  item!: ReservationItem;
  @ApiProperty() createdAt!: Date;

  static from(r: Reservation): ReservationResponseDto {
    const dto = new ReservationResponseDto();
    dto.reference = r.reference;
    dto.type = r.type;
    dto.status = r.status;
    dto.total = pesewasToCedis(r.totalMinor);
    dto.currency = r.currency;
    dto.item = r.item;
    dto.createdAt = r.createdAt;
    return dto;
  }
}
