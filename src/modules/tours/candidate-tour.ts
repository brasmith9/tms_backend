/** A real, approved tour offered to the itinerary planner as grounding. */
export interface CandidateTour {
  id: string;
  slug: string;
  title: string;
  destinationName: string;
  priceMinor: number;
  durationMinutes: number;
}
