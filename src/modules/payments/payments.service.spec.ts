import { Test } from '@nestjs/testing';
import { DataSource, EntityManager } from 'typeorm';
import { PaymentsService } from './payments.service';
import { PaymentsRepository } from './payments.repository';
import { PaystackClient } from './paystack.client';
import { BookingsService } from '../bookings/bookings.service';
import { UsersService } from '../users/users.service';
import { PaymentStatus } from './entities/payment.entity';

describe('PaymentsService webhook', () => {
  let service: PaymentsService;
  let repo: { findByProviderRef: jest.Mock; save: jest.Mock };
  let bookings: { confirmPaid: jest.Mock; notifyStatusChanged: jest.Mock };

  beforeEach(async () => {
    repo = {
      findByProviderRef: jest.fn(),
      save: jest.fn((p: unknown) => Promise.resolve(p)),
    };
    bookings = { confirmPaid: jest.fn(), notifyStatusChanged: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PaymentsRepository, useValue: repo },
        { provide: PaystackClient, useValue: { verifySignature: () => true } },
        { provide: BookingsService, useValue: bookings },
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
      status: PaymentStatus.PENDING,
    });
    await service.handleWebhook(rawEvent(), 'sig');
    expect(bookings.confirmPaid).toHaveBeenCalledWith('b1', expect.anything());
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
