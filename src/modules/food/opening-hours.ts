import { OpeningHour } from './entities/restaurant.entity';

function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** Whether the restaurant is open at the given instant, per its weekly hours. */
export function isOpenAt(hours: OpeningHour[], at: Date): boolean {
  const day = at.getUTCDay();
  const now = at.getUTCHours() * 60 + at.getUTCMinutes();
  return hours.some(
    (h) => h.day === day && now >= minutes(h.opens) && now < minutes(h.closes),
  );
}

/**
 * Hourly bookable slots for a given date, as ISO strings, derived from the
 * day's opening window (last slot one hour before close).
 */
export function availableSlots(hours: OpeningHour[], date: Date): string[] {
  const day = date.getUTCDay();
  const window = hours.find((h) => h.day === day);
  if (!window) return [];

  const start = minutes(window.opens);
  const end = minutes(window.closes) - 60;
  const slots: string[] = [];
  for (let m = start; m <= end; m += 60) {
    const slot = new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        Math.floor(m / 60),
        m % 60,
      ),
    );
    slots.push(slot.toISOString());
  }
  return slots;
}
