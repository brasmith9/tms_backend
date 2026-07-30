import { ApiProperty } from '@nestjs/swagger';
import { LoyaltyTier } from '../loyalty';

export class LoyaltyResponseDto {
  @ApiProperty() points!: number;
  @ApiProperty({ example: 'GOLD' }) tier!: LoyaltyTier;
}
