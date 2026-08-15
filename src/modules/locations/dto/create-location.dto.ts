import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { LocationCategory } from '../entities/location.entity';

export class CreateLocationDto {
  @ApiProperty({ example: 'balme-library' })
  @IsString()
  @Length(2, 120)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lower-case words separated by hyphens',
  })
  slug!: string;

  @ApiProperty({ example: 'Balme Library' })
  @IsString()
  @Length(2, 160)
  name!: string;

  @ApiProperty({ enum: LocationCategory })
  @IsEnum(LocationCategory)
  category!: LocationCategory;

  @ApiPropertyOptional({ example: 'The main university library.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 5.6508 }) @IsLatitude() lat!: number;
  @ApiProperty({ example: -0.1869 }) @IsLongitude() lng!: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @ApiPropertyOptional({ example: 'Opposite the Great Hall lawn.' })
  @IsOptional()
  @IsString()
  buildingNotes?: string;
}
