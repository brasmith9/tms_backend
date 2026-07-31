import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';
import { SosKind } from '../entities/sos-alert.entity';

export class TriggerSosDto {
  @ApiProperty({
    description:
      'Client-generated UUID; repeated taps with the same id are deduped',
  })
  @IsUUID()
  alertId!: string;

  @ApiProperty({ example: 5.55 }) @IsLatitude() lat!: number;
  @ApiProperty({ example: -0.196 }) @IsLongitude() lng!: number;

  @ApiProperty({ enum: SosKind }) @IsEnum(SosKind) kind!: SosKind;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 500)
  note?: string;
}
