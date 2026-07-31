import { ApiProperty } from '@nestjs/swagger';
import { pesewasToCedis } from '../../../common/money';
import { Payment, PaymentStatus } from '../entities/payment.entity';

export class PaymentResponseDto {
  @ApiProperty() providerRef!: string;
  @ApiProperty({ enum: PaymentStatus }) status!: PaymentStatus;
  @ApiProperty({ example: 301, description: 'Amount in GHS' }) amount!: number;
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
    dto.amount = pesewasToCedis(p.amountMinor);
    dto.currency = p.currency;
    dto.authorizationUrl = p.authorizationUrl;
    return dto;
  }
}
