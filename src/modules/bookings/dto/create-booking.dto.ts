import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Max, Min } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty() @IsUUID() departureId!: string;

  @ApiProperty({ example: 2, minimum: 1, maximum: 20 })
  @IsInt()
  @Min(1)
  @Max(20)
  seats!: number;
}
