import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/auth-user.type';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('initiate')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Initialise a Paystack transaction for a booking' })
  async initiate(
    @CurrentUser() user: AuthUser,
    @Body() dto: InitiatePaymentDto,
  ): Promise<PaymentResponseDto> {
    return PaymentResponseDto.from(
      await this.payments.initiate(dto.bookingReference, user),
    );
  }

  @Post('webhook')
  @ApiExcludeEndpoint()
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-paystack-signature') signature: string,
  ): Promise<{ received: true }> {
    await this.payments.handleWebhook(req.rawBody as Buffer, signature);
    return { received: true };
  }

  @Get(':reference/verify')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Reconcile a payment against Paystack' })
  async verify(
    @CurrentUser() user: AuthUser,
    @Param('reference') reference: string,
  ): Promise<PaymentResponseDto> {
    return PaymentResponseDto.from(await this.payments.verify(reference, user));
  }
}
