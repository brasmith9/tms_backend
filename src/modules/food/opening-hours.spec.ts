import { OpeningHour } from './entities/restaurant.entity';
import { availableSlots, isOpenAt } from './opening-hours';

// Wednesday 2026-08-19 is getUTCDay() === 3
const hours: OpeningHour[] = [{ day: 3, opens: '09:00', closes: '17:00' }];

describe('opening-hours', () => {
  it('reports open inside the window and closed outside', () => {
    expect(isOpenAt(hours, new Date('2026-08-19T12:00:00Z'))).toBe(true);
    expect(isOpenAt(hours, new Date('2026-08-19T18:00:00Z'))).toBe(false);
    expect(isOpenAt(hours, new Date('2026-08-20T12:00:00Z'))).toBe(false); // Thu
  });

  it('generates hourly slots up to one hour before close', () => {
    const slots = availableSlots(hours, new Date('2026-08-19T00:00:00Z'));
    expect(slots[0]).toBe('2026-08-19T09:00:00.000Z');
    expect(slots[slots.length - 1]).toBe('2026-08-19T16:00:00.000Z');
    expect(slots).toHaveLength(8);
  });

  it('returns no slots on a closed day', () => {
    expect(availableSlots(hours, new Date('2026-08-20T00:00:00Z'))).toEqual([]);
  });
});
