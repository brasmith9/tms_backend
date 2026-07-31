export const BOOKING_CANCELLED = 'booking.cancelled';
export const BOOKING_STATUS_CHANGED = 'booking.status_changed';
export const AVAILABILITY_CHANGED = 'availability.changed';

export interface BookingCancelledEvent {
  bookingId: string;
  reference: string;
}

export interface BookingStatusChangedEvent {
  userId: string;
  reference: string;
  /** A booking or reservation status value (both share the same strings). */
  status: string;
  changedAt: string;
}

export interface AvailabilityChangedEvent {
  departureId: string;
  seatsLeft: number;
  capacity: number;
}
