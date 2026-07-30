import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import { BOOKING_CANCELLED } from '../bookings/booking-events';
import type { BookingCancelledEvent } from '../bookings/booking-events';
import { PaystackClient } from './paystack.client';
import { PaymentsRepository } from './payments.repository';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { BookingsService } from '../bookings/bookings.service';
import { BookingStatus } from '../bookings/entities/tour-booking.entity';
import { UsersService } from '../users/users.service';
import type { AuthUser } from '../auth/auth-user.type';

interface PaystackEvent {
  event: string;
  data: { reference: string };
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly repo: PaymentsRepository,
    private readonly paystack: PaystackClient,
    private readonly bookings: BookingsService,
    private readonly users: UsersService,
    private readonly dataSource: DataSource,
  ) {}

  async initiate(reference: string, tourist: AuthUser): Promise<Payment> {
    const booking = await this.bookings.findByReference(reference, tourist);
    if (booking.touristId !== tourist.id) {
      throw new ForbiddenException('Not your booking');
    }
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Only a pending booking can be paid');
    }
    const user = await this.users.findById(tourist.id);
    const init = await this.paystack.initializeTransaction({
      email: user.email,
      amountMinor: booking.totalMinor,
      reference: booking.reference, // Paystack reference == booking reference
      currency: booking.currency,
    });
    return this.repo.save(
      this.repo.create({
        bookingId: booking.id,
        providerRef: init.reference,
        amountMinor: booking.totalMinor,
        currency: booking.currency,
        status: PaymentStatus.PENDING,
        authorizationUrl: init.authorizationUrl,
      }),
    );
  }

  async handleWebhook(raw: Buffer, signature: string): Promise<void> {
    if (!this.paystack.verifySignature(raw, signature)) {
      throw new ForbiddenException('Invalid signature');
    }
    const event = JSON.parse(raw.toString()) as PaystackEvent;
    if (event.event !== 'charge.success') return;

    const payment = await this.repo.findByProviderRef(event.data.reference);
    if (!payment || payment.status === PaymentStatus.PAID) return; // idempotent

    await this.dataSource.transaction(async (manager) => {
      payment.status = PaymentStatus.PAID;
      payment.rawEvent = event;
      await this.repo.save(payment, manager);
      await this.bookings.confirmPaid(payment.bookingId, manager);
    });
  }

  async verify(reference: string, tourist: AuthUser): Promise<Payment> {
    const booking = await this.bookings.findByReference(reference, tourist);
    const payment = await this.repo.findByBookingId(booking.id);
    if (!payment) throw new NotFoundException('No payment for this booking');

    const result = await this.paystack.verifyTransaction(payment.providerRef);
    if (result.status === 'success' && payment.status !== PaymentStatus.PAID) {
      await this.dataSource.transaction(async (manager) => {
        payment.status = PaymentStatus.PAID;
        await this.repo.save(payment, manager);
        await this.bookings.confirmPaid(payment.bookingId, manager);
      });
    }
    return payment;
  }

  /** Refund a paid booking's payment when its cancellation is honoured. */
  @OnEvent(BOOKING_CANCELLED)
  async refundForBooking(event: BookingCancelledEvent): Promise<void> {
    const payment = await this.repo.findByBookingId(event.bookingId);
    if (!payment || payment.status !== PaymentStatus.PAID) return;
    await this.paystack.createRefund(payment.providerRef);
    payment.status = PaymentStatus.REFUNDED;
    await this.repo.save(payment);
  }
}
