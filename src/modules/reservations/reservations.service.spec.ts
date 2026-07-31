import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { DataSource, EntityManager } from 'typeorm';
import { UserRole } from '../users/entities/user.entity';
import {
  Reservation,
  ReservationStatus,
  ReservationType,
} from './entities/reservation.entity';
import { ReservationsRepository } from './reservations.repository';
import { ReservationsService } from './reservations.service';

describe('ReservationsService', () => {
  let service: ReservationsService;
  let repo: Record<string, jest.Mock>;
  let events: { emit: jest.Mock };

  beforeEach(async () => {
    repo = {
      create: jest.fn((input: Partial<Reservation>) => input),
      save: jest.fn((r: Reservation) => Promise.resolve({ id: 'r1', ...r })),
      findByReference: jest.fn(),
      findMine: jest.fn(),
      countForYear: jest.fn().mockResolvedValue(0),
    };
    // transaction just runs the callback with a fake manager
    const dataSource = {
      transaction: jest.fn((cb: (m: EntityManager) => unknown) =>
        cb({} as EntityManager),
      ),
    };
    events = { emit: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        ReservationsService,
        { provide: ReservationsRepository, useValue: repo },
        { provide: DataSource, useValue: dataSource },
        { provide: EventEmitter2, useValue: events },
      ],
    }).compile();
    service = module.get(ReservationsService);
  });

  it('confirms a free reservation immediately and emits a status event', async () => {
    const r = await service.create({
      userId: 'u1',
      type: ReservationType.TABLE,
      item: { id: 'rest1', title: 'Buka' },
      totalMinor: 0,
      confirmImmediately: true,
    });
    expect(r.status).toBe(ReservationStatus.CONFIRMED);
    expect(r.reference).toMatch(/^TBL-\d{4}-0001$/);
    expect(events.emit).toHaveBeenCalledWith(
      'booking.status_changed',
      expect.objectContaining({ reference: r.reference, userId: 'u1' }),
    );
  });

  it('leaves a payable reservation PENDING', async () => {
    const r = await service.create({
      userId: 'u1',
      type: ReservationType.STAY,
      item: { id: 's1', title: 'Hotel' },
      totalMinor: 50000,
    });
    expect(r.status).toBe(ReservationStatus.PENDING);
    expect(r.reference).toMatch(/^STY-\d{4}-0001$/);
  });

  it('404s an unknown reference and forbids a non-owner', async () => {
    repo.findByReference.mockResolvedValueOnce(null);
    await expect(
      service.findByReference('X', { id: 'u1', role: UserRole.TOURIST } as never),
    ).rejects.toThrow(NotFoundException);

    repo.findByReference.mockResolvedValueOnce({
      reference: 'STY-2026-0001',
      userId: 'owner',
    });
    await expect(
      service.findByReference('STY-2026-0001', {
        id: 'someone-else',
        role: UserRole.TOURIST,
      } as never),
    ).rejects.toThrow(ForbiddenException);
  });
});
