import { Test } from '@nestjs/testing';
import { DataSource, EntityManager } from 'typeorm';
import { PaymentsService } from './payments.service';
import { PaymentsRepository } from './payments.repository';
import { PaystackClient } from './paystack.client';
import { BookingsService } from '../bookings/bookings.service';
import { ReservationsService } from '../reservations/reservations.service';
import { UsersService } from '../users/users.service';
import { PaymentSource, PaymentStatus } from './entities/payment.entity';

describe('PaymentsService webhook', () => {
  let service: PaymentsService;
  let repo: { findByProviderRef: jest.Mock; save: jest.Mock };
  let bookings: { confirmPaid: jest.Mock; notifyStatusChanged: jest.Mock };
  let reservations: { confirmPaid: jest.Mock; notifyStatusChanged: jest.Mock };

  beforeEach(async () => {
    repo = {
      findByProviderRef: jest.fn(),
      save: jest.fn((p: unknown) => Promise.resolve(p)),
    };
    bookings = { confirmPaid: jest.fn(), notifyStatusChanged: jest.fn() };
    reservations = { confirmPaid: jest.fn(), notifyStatusChanged: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PaymentsRepository, useValue: repo },
        { provide: PaystackClient, useValue: { verifySignature: () => true } },
        { provide: BookingsService, useValue: bookings },
        { provide: ReservationsService, useValue: reservations },
        { provide: UsersService, useValue: {} },
        {
          provide: DataSource,
          useValue: {
            transaction: (cb: (m: EntityManager) => unknown) =>
              cb({} as EntityManager),
          },
        },
      ],
    }).compile();
    service = module.get(PaymentsService);
  });

  const rawEvent = () =>
    Buffer.from(
      JSON.stringify({
        event: 'charge.success',
        data: { reference: 'TUR-2026-0007' },
      }),
    );

  it('confirms the booking on first charge.success', async () => {
    repo.findByProviderRef.mockResolvedValue({
      id: 'p1',
      bookingId: 'b1',
      source: PaymentSource.TOUR,
      status: PaymentStatus.PENDING,
    });
    await service.handleWebhook(rawEvent(), 'sig');
    expect(bookings.confirmPaid).toHaveBeenCalledWith('b1', expect.anything());
    expect(reservations.confirmPaid).not.toHaveBeenCalled();
  });

  it('confirms the reservation when the payment source is RESERVATION', async () => {
    repo.findByProviderRef.mockResolvedValue({
      id: 'p2',
      bookingId: 'r1',
      source: PaymentSource.RESERVATION,
      status: PaymentStatus.PENDING,
    });
    await service.handleWebhook(rawEvent(), 'sig');
    expect(reservations.confirmPaid).toHaveBeenCalledWith(
      'r1',
      expect.anything(),
    );
    expect(bookings.confirmPaid).not.toHaveBeenCalled();
  });

  it('ignores a replayed webhook for an already-paid payment', async () => {
    repo.findByProviderRef.mockResolvedValue({
      id: 'p1',
      bookingId: 'b1',
      status: PaymentStatus.PAID,
    });
    await service.handleWebhook(rawEvent(), 'sig');
    expect(bookings.confirmPaid).not.toHaveBeenCalled();
  });

  it('ignores non-charge events', async () => {
    const raw = Buffer.from(
      JSON.stringify({ event: 'transfer.success', data: { reference: 'x' } }),
    );
    await service.handleWebhook(raw, 'sig');
    expect(repo.findByProviderRef).not.toHaveBeenCalled();
  });
});
