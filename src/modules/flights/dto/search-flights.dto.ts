import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Cabin } from '../entities/flight.entity';

export enum TripType {
  ONE_WAY = 'ONE_WAY',
  RETURN = 'RETURN',
  MULTI_CITY = 'MULTI_CITY',
}

export class PassengerCountsDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(9)
  adults!: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9)
  children?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9)
  infants?: number;
}

export class SearchFlightsDto {
  @ApiProperty({ enum: TripType, example: TripType.ONE_WAY })
  @IsEnum(TripType)
  tripType!: TripType;

  @ApiProperty({ example: 'ACC' }) @IsString() @Length(3, 3) origin!: string;
  @ApiProperty({ example: 'LOS' })
  @IsString()
  @Length(3, 3)
  destination!: string;

  @ApiProperty({ example: '2026-09-10T00:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  date!: Date;

  @ApiProperty({ type: PassengerCountsDto })
  @IsObject()
  @ValidateNested()
  @Type(() => PassengerCountsDto)
  passengers!: PassengerCountsDto;

  @ApiProperty({ enum: Cabin, example: Cabin.ECONOMY })
  @IsEnum(Cabin)
  cabin!: Cabin;

  @ApiPropertyOptional({
    example: 'price',
    description: 'price | -price | departsAt',
  })
  @IsOptional()
  @IsString()
  sort?: string;
}
