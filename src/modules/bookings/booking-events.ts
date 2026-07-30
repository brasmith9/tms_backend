export const BOOKING_CANCELLED = 'booking.cancelled';

export interface BookingCancelledEvent {
  bookingId: string;
  reference: string;
}
