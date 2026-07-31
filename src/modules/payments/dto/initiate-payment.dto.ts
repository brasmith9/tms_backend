import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class InitiatePaymentDto {
  @ApiProperty({ example: 'TUR-2026-0007' })
  @IsString()
  @Matches(/^(TUR|STY|FLT|TBL)-\d{4}-\d{4,}$/, {
    message: 'bookingReference must look like TUR-2026-0007',
  })
  bookingReference!: string;
}
