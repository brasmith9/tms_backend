import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class BookStayDto {
  @ApiProperty() @IsUUID() roomId!: string;

  @ApiProperty({ example: '2026-09-01T00:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  checkIn!: Date;

  @ApiProperty({ example: '2026-09-04T00:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  checkOut!: Date;

  @ApiProperty({ example: 2, minimum: 1, maximum: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  guests!: number;
}

export class RoomsQueryDto {
  @ApiPropertyOptional({ example: '2026-09-01T00:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  checkIn?: Date;

  @ApiPropertyOptional({ example: '2026-09-04T00:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  checkOut?: Date;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  guests?: number;
}
