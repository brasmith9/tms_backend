/** A campus location offered to the model as a real, citable record. */
export interface CandidateLocation {
  id: string;
  slug: string;
  name: string;
  category: string;
  buildingNotes?: string;
}

/** A campus food joint offered to the model as a real, citable record. */
export interface CandidateFoodJoint {
  id: string;
  slug: string;
  name: string;
  cuisine: string;
  priceTier: number;
  /**
   * Channels the vendor consented to publish. Empty means the model must not
   * offer to contact them. The numbers themselves are never sent to the model —
   * it only needs to know a channel exists.
   */
  contact: ('CALL' | 'WHATSAPP')[];
  nearestLocationName?: string;
}

export interface AssistantTurn {
  role: 'USER' | 'ASSISTANT';
  content: string;
}

export interface AssistantRequest {
  message: string;
  /** Prior turns in this session, oldest first. */
  history: AssistantTurn[];
  candidateLocations: CandidateLocation[];
  candidateFoodJoints: CandidateFoodJoint[];
}

export interface AssistantResult {
  /** Prose reply as returned by the model — unvalidated; the service grounds it. */
  reply: string;
  /** Raw actions as returned by the model — unvalidated; the service grounds them. */
  actions: unknown;
  /** Model id that produced the reply, for traceability. */
  model: string;
}

/** Port the assistant service depends on; OpenRouterAssistant fulfils it. */
export interface AssistantPort {
  reply(req: AssistantRequest): Promise<AssistantResult>;

  /**
   * Same contract as `reply`, but pushes prose to `onDelta` as it arrives so the
   * client can render inside NFR-3's 3–5s budget. Actions still come back only
   * in the resolved result, because only the resolved result gets grounded.
   */
  replyStream(
    req: AssistantRequest,
    onDelta: (text: string) => void,
  ): Promise<AssistantResult>;
}

export const ASSISTANT_PORT = 'ASSISTANT_PORT';
