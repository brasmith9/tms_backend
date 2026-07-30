import { Test } from '@nestjs/testing';
import { BookingsScheduler } from './bookings.scheduler';
import { BookingsService } from './bookings.service';

describe('BookingsScheduler', () => {
  it('asks the service to expire stale pending bookings', async () => {
    const bookings = {
      expireStalePending: jest.fn().mockResolvedValue(2),
      markCompletedAndAward: jest.fn().mockResolvedValue(0),
    };
    const module = await Test.createTestingModule({
      providers: [
        BookingsScheduler,
        { provide: BookingsService, useValue: bookings },
      ],
    }).compile();

    const scheduler = module.get(BookingsScheduler);
    await scheduler.expireHolds();
    expect(bookings.expireStalePending).toHaveBeenCalled();
  });

  it('completes past departures and awards points', async () => {
    const bookings = {
      expireStalePending: jest.fn().mockResolvedValue(0),
      markCompletedAndAward: jest.fn().mockResolvedValue(3),
    };
    const module = await Test.createTestingModule({
      providers: [
        BookingsScheduler,
        { provide: BookingsService, useValue: bookings },
      ],
    }).compile();

    const scheduler = module.get(BookingsScheduler);
    await scheduler.completePastDepartures();
    expect(bookings.markCompletedAndAward).toHaveBeenCalled();
  });
});
