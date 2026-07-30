import { ApiProperty } from '@nestjs/swagger';
import type { LoyaltyTier } from '../loyalty';

export class LoyaltyResponseDto {
  @ApiProperty() points!: number;
  @ApiProperty({ example: 'GOLD' }) tier!: LoyaltyTier;
}
