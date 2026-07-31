import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsInt, Max, Min } from 'class-validator';

export class ReserveTableDto {
  @ApiProperty({
    example: '2026-08-20T19:00:00.000Z',
    description: 'Reservation time',
  })
  @Type(() => Date)
  @IsDate()
  at!: Date;

  @ApiProperty({ example: 2, minimum: 1, maximum: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  partySize!: number;
}

export class AvailabilityQueryDto {
  @ApiProperty({
    example: '2026-08-20T00:00:00.000Z',
    description: 'Date to check',
  })
  @Type(() => Date)
  @IsDate()
  date!: Date;

  @ApiProperty({ example: 2, minimum: 1, maximum: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  partySize!: number;
}
