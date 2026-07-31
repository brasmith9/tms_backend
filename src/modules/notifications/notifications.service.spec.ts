import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { RideStatus } from '../rides/ride.types';
import { Notification } from './entities/notification.entity';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let repo: jest.Mocked<Repository<Notification>>;
  let events: { emit: jest.Mock };

  beforeEach(() => {
    repo = {
      create: jest.fn((x: unknown) => x),
      save: jest.fn((x: Notification) =>
        Promise.resolve({ id: 'n1', createdAt: new Date(), ...x }),
      ),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      update: jest.fn().mockResolvedValue({ affected: 3 }),
    } as unknown as jest.Mocked<Repository<Notification>>;
    events = { emit: jest.fn() };
    service = new NotificationsService(
      repo,
      events as unknown as EventEmitter2,
    );
  });

  it('creates and broadcasts a notification on a CONFIRMED booking', async () => {
    await service.onBookingStatus({
      userId: 'u1',
      reference: 'STY-2026-0001',
      status: 'CONFIRMED',
      changedAt: new Date().toISOString(),
    });
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', type: 'BOOKING' }),
    );
    expect(events.emit).toHaveBeenCalledWith(
      'notification.created',
      expect.objectContaining({ userId: 'u1', title: 'Booking confirmed' }),
    );
  });

  it('does not notify on noisy ride ticks (ARRIVING/IN_PROGRESS)', async () => {
    await service.onRideStatus({
      rideId: 'r1',
      userId: 'u1',
      status: RideStatus.ARRIVING,
      changedAt: new Date().toISOString(),
    });
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('notifies when a ride is COMPLETED', async () => {
    await service.onRideStatus({
      rideId: 'r1',
      userId: 'u1',
      status: RideStatus.COMPLETED,
      changedAt: new Date().toISOString(),
    });
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'RIDE', title: 'Ride complete' }),
    );
  });

  it('marks all unread as read', async () => {
    expect(await service.markAllRead('u1')).toBe(3);
  });
});
