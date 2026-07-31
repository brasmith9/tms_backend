import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsObject,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';
import { VehicleType } from '../ride.types';

export class GeoPointDto {
  @ApiProperty({ example: 5.56 })
  @Type(() => Number)
  @IsLatitude()
  lat!: number;
  @ApiProperty({ example: -0.2 })
  @Type(() => Number)
  @IsLongitude()
  lng!: number;
  @ApiProperty({ example: 'Kotoka Airport' })
  @IsString()
  @Length(1, 160)
  label!: string;
}

export class QuoteRideDto {
  @ApiProperty({ enum: VehicleType })
  @IsEnum(VehicleType)
  vehicleType!: VehicleType;

  @ApiProperty({ type: GeoPointDto })
  @IsObject()
  @ValidateNested()
  @Type(() => GeoPointDto)
  pickup!: GeoPointDto;

  @ApiProperty({ type: GeoPointDto })
  @IsObject()
  @ValidateNested()
  @Type(() => GeoPointDto)
  dropoff!: GeoPointDto;

  @ApiPropertyOptional({ description: 'Schedule for later instead of now' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledAt?: Date;
}
