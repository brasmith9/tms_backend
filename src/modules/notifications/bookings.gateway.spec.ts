import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server } from 'socket.io';
import { BookingsGateway } from './bookings.gateway';
import { BookingStatus } from '../bookings/entities/tour-booking.entity';

describe('BookingsGateway', () => {
  it('emits booking.status_changed to the user room', () => {
    const emit = jest.fn();
    const to = jest.fn(() => ({ emit }));
    const gateway = new BookingsGateway({} as JwtService, {} as ConfigService);
    gateway.server = { to } as unknown as Server;

    gateway.emitStatusChanged('u1', {
      userId: 'u1',
      reference: 'TUR-2026-0007',
      status: BookingStatus.CONFIRMED,
      changedAt: '2026-07-30T00:00:00.000Z',
    });

    expect(to).toHaveBeenCalledWith('user:u1');
    expect(emit).toHaveBeenCalledWith(
      'booking.status_changed',
      expect.objectContaining({
        reference: 'TUR-2026-0007',
        status: 'CONFIRMED',
      }),
    );
  });
});
