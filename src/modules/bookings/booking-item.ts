/**
 * A compact summary of the booked tour, embedded in a booking response so the
 * client can render a trips list without fetching each tour separately.
 */
export interface BookingItem {
  id: string;
  slug: string;
  title: string;
  imageUrl?: string;
  startsAt?: string;
}
