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
import {
  Payment,
  PaymentSource,
  PaymentStatus,
} from './entities/payment.entity';
import { BookingsService } from '../bookings/bookings.service';
import { BookingStatus } from '../bookings/entities/tour-booking.entity';
import { ReservationsService } from '../reservations/reservations.service';
import { ReservationStatus } from '../reservations/entities/reservation.entity';
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
    private readonly reservations: ReservationsService,
    private readonly users: UsersService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Starts a Paystack transaction for a pending booking. Tour references
   * (`TUR-…`) settle a tour booking; any other reference settles a reservation.
   */
  async initiate(reference: string, tourist: AuthUser): Promise<Payment> {
    const payable = reference.startsWith('TUR-')
      ? await this.tourPayable(reference, tourist)
      : await this.reservationPayable(reference, tourist);

    const user = await this.users.findById(tourist.id);
    const init = await this.paystack.initializeTransaction({
      email: user.email,
      amountMinor: payable.amountMinor,
      reference: payable.reference, // Paystack reference == booking reference
      currency: payable.currency,
    });
    return this.repo.save(
      this.repo.create({
        bookingId: payable.id,
        source: payable.source,
        providerRef: init.reference,
        amountMinor: payable.amountMinor,
        currency: payable.currency,
        status: PaymentStatus.PENDING,
        authorizationUrl: init.authorizationUrl,
      }),
    );
  }

  private async tourPayable(reference: string, tourist: AuthUser) {
    const booking = await this.bookings.findByReference(reference, tourist);
    if (booking.touristId !== tourist.id) {
      throw new ForbiddenException('Not your booking');
    }
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Only a pending booking can be paid');
    }
    return {
      id: booking.id,
      reference: booking.reference,
      amountMinor: booking.totalMinor,
      currency: booking.currency,
      source: PaymentSource.TOUR,
    };
  }

  private async reservationPayable(reference: string, tourist: AuthUser) {
    const reservation = await this.reservations.findByReference(
      reference,
      tourist,
    );
    if (reservation.userId !== tourist.id) {
      throw new ForbiddenException('Not your reservation');
    }
    if (reservation.status !== ReservationStatus.PENDING) {
      throw new BadRequestException('Only a pending reservation can be paid');
    }
    return {
      id: reservation.id,
      reference: reservation.reference,
      amountMinor: reservation.totalMinor,
      currency: reservation.currency,
      source: PaymentSource.RESERVATION,
    };
  }

  async handleWebhook(raw: Buffer, signature: string): Promise<void> {
    if (!this.paystack.verifySignature(raw, signature)) {
      throw new ForbiddenException('Invalid signature');
    }
    const event = JSON.parse(raw.toString()) as PaystackEvent;
    if (event.event !== 'charge.success') return;

    const payment = await this.repo.findByProviderRef(event.data.reference);
    if (!payment || payment.status === PaymentStatus.PAID) return; // idempotent

    payment.rawEvent = event;
    const notify = await this.confirmAndNotify(payment);
    notify();
  }

  async verify(reference: string, tourist: AuthUser): Promise<Payment> {
    const payment = await this.repo.findByProviderRef(reference);
    if (!payment) throw new NotFoundException('No payment for this reference');
    // Reuse the booking/reservation lookups to enforce ownership (they throw).
    if (payment.source === PaymentSource.TOUR) {
      await this.bookings.findByReference(reference, tourist);
    } else {
      await this.reservations.findByReference(reference, tourist);
    }

    const result = await this.paystack.verifyTransaction(payment.providerRef);
    if (result.status === 'success' && payment.status !== PaymentStatus.PAID) {
      const notify = await this.confirmAndNotify(payment);
      notify();
    }
    return payment;
  }

  /**
   * Marks the payment PAID and confirms the booking it settles, dispatching by
   * source. Returns a closure that pushes the status to the client — call it
   * after the transaction commits.
   */
  private confirmAndNotify(payment: Payment): Promise<() => void> {
    return this.dataSource.transaction(async (manager) => {
      payment.status = PaymentStatus.PAID;
      await this.repo.save(payment, manager);
      if (payment.source === PaymentSource.TOUR) {
        const booking = await this.bookings.confirmPaid(
          payment.bookingId,
          manager,
        );
        return () => this.bookings.notifyStatusChanged(booking);
      }
      const reservation = await this.reservations.confirmPaid(
        payment.bookingId,
        manager,
      );
      return () => this.reservations.notifyStatusChanged(reservation);
    });
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
