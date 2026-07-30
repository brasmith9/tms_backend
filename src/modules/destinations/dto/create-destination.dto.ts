import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CreateDestinationDto {
  @ApiProperty({ example: 'Cape Coast' })
  @IsString()
  @Length(2, 120)
  name!: string;

  @ApiProperty({ example: 'Central Region' }) @IsString() region!: string;

  @ApiPropertyOptional({ example: 'Ghana' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ example: 'Historic coastal town with colonial-era forts.' })
  @IsString()
  description!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() heroImageUrl?: string;

  @ApiPropertyOptional({ example: 5.106 })
  @IsOptional()
  @IsLatitude()
  lat?: number;

  @ApiPropertyOptional({ example: -1.246 })
  @IsOptional()
  @IsLongitude()
  lng?: number;
}
