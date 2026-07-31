import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class GenerateItineraryDto {
  @ApiProperty({ example: 'Cape Coast' })
  @IsString()
  @Length(2, 120)
  destination!: string;

  @ApiProperty({ example: 3, minimum: 1, maximum: 14 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(14)
  days!: number;

  @ApiPropertyOptional({
    example: 2000.5,
    description: 'Budget in GHS, up to 2 decimals',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  budget?: number;

  @ApiPropertyOptional({ example: 2, minimum: 1, maximum: 20, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  partySize?: number;

  @ApiPropertyOptional({ type: [String], example: ['history', 'beaches'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @Length(1, 40, { each: true })
  interests?: string[];
}
