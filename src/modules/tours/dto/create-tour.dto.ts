import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';

export class CreateTourDto {
  @ApiProperty({ example: 'Kakum Canopy Walk' })
  @IsString()
  @Length(3, 160)
  title!: string;

  @ApiProperty() @IsUUID() destinationId!: string;

  @ApiProperty({ example: 'A guided walk across the Kakum forest canopy.' })
  @IsString()
  description!: string;

  @ApiProperty({
    example: 150.5,
    description: 'Price in GHS, up to 2 decimals',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price!: number;

  @ApiProperty({ example: 180 }) @IsInt() @Min(1) durationMinutes!: number;

  @ApiPropertyOptional() @IsOptional() @IsString() heroImageUrl?: string;
}
