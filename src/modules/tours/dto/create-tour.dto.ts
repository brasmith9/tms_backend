import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
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

  @ApiProperty({ example: 12000, description: 'Price in pesewas (GHS 120.00)' })
  @IsInt()
  @Min(0)
  priceMinor!: number;

  @ApiProperty({ example: 180 }) @IsInt() @Min(1) durationMinutes!: number;

  @ApiPropertyOptional() @IsOptional() @IsString() heroImageUrl?: string;
}
