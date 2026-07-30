/**
 * Port that lets TourDeparturesService ask the bookings module how many seats
 * are consumed on a departure, without a hard dependency on it. The bookings
 * module (Task 7) provides the implementation under this token via forwardRef.
 */
export const SEAT_COUNTER = 'SEAT_COUNTER';

export interface SeatCounter {
  seatsConsumed(departureId: string): Promise<number>;
}
