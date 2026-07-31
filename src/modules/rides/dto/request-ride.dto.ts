import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { VehicleType } from '../ride.types';

export class RequestRideDto {
  @ApiProperty({ description: 'A valid, unexpired quote id' })
  @IsUUID()
  quoteId!: string;
}

export class NearbyDriversQueryDto {
  @ApiProperty({ example: 5.56 })
  @Type(() => Number)
  @IsLatitude()
  lat!: number;
  @ApiProperty({ example: -0.2 })
  @Type(() => Number)
  @IsLongitude()
  lng!: number;

  @ApiProperty({ enum: VehicleType, required: false })
  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;
}
