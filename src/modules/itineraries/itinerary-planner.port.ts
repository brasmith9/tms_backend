import { CandidateTour } from '../tours/candidate-tour';

export type ItemPeriod = 'morning' | 'afternoon' | 'evening';
export type ItemKind = 'TOUR' | 'MEAL' | 'FREE' | 'TIP';

export interface PlanItem {
  period: ItemPeriod;
  kind: ItemKind;
  title: string;
  description: string;
  tourId?: string;
  tourSlug?: string;
  estimatedCostMinor?: number;
  bookable: boolean;
}

export interface PlanDay {
  day: number;
  title: string;
  items: PlanItem[];
}

export interface ItineraryPlan {
  summary: string;
  estimatedTotalMinor?: number;
  notes?: string[];
  days: PlanDay[];
}

export interface PlannerRequest {
  destination: string;
  days: number;
  budgetMinor?: number;
  partySize: number;
  interests: string[];
  candidateTours: CandidateTour[];
}

export interface PlannerResult {
  /** Headline the model produced for the itinerary. */
  title: string;
  /** The plan as returned by the model — unvalidated; the service sanitizes it. */
  plan: ItineraryPlan;
  /** Model id that produced the plan, for traceability. */
  model: string;
}

/** Port the itinerary service depends on; OpenRouterPlanner fulfils it. */
export interface ItineraryPlannerPort {
  plan(req: PlannerRequest): Promise<PlannerResult>;
}

export const ITINERARY_PLANNER = 'ITINERARY_PLANNER';
