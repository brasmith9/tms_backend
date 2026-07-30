import { ApiProperty } from '@nestjs/swagger';
import { Payment, PaymentStatus } from '../entities/payment.entity';

export class PaymentResponseDto {
  @ApiProperty() providerRef!: string;
  @ApiProperty({ enum: PaymentStatus }) status!: PaymentStatus;
  @ApiProperty() amountMinor!: number;
  @ApiProperty() currency!: string;
  @ApiProperty({
    required: false,
    description: 'Paystack checkout URL to redirect the customer to',
  })
  authorizationUrl?: string;

  static from(p: Payment): PaymentResponseDto {
    const dto = new PaymentResponseDto();
    dto.providerRef = p.providerRef;
    dto.status = p.status;
    dto.amountMinor = p.amountMinor;
    dto.currency = p.currency;
    dto.authorizationUrl = p.authorizationUrl;
    return dto;
  }
}
