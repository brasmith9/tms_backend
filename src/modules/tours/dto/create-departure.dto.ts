import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsInt, Min } from 'class-validator';

export class CreateDepartureDto {
  @ApiProperty({ example: '2026-08-25T08:30:00.000Z' })
  @Type(() => Date)
  @IsDate()
  departsAt!: Date;

  @ApiProperty({ example: 20 }) @IsInt() @Min(1) capacity!: number;
}
