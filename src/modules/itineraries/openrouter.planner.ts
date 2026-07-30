import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  ItineraryPlan,
  ItineraryPlannerPort,
  PlannerRequest,
  PlannerResult,
} from './itinerary-planner.port';

interface AiConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
  timeoutMs: number;
}

interface ChatCompletion {
  choices?: { message?: { content?: string } }[];
}

/** Shape we hope the model returns; every field is treated as untrusted. */
interface ModelItinerary extends Partial<ItineraryPlan> {
  title?: string;
}

const SYSTEM_PROMPT = `You are Voyago's Ghana travel planner. Build a realistic day-by-day itinerary.
You are given a list of REAL bookable tours. Use ONLY those tours for any bookable activity and
reference each by its exact "id". You may add meals, free time and local tips as extra items, but
mark those as non-bookable and never invent a tour id.

Respond with ONLY a JSON object of this shape:
{
  "title": string,
  "summary": string,
  "estimatedTotalMinor": number,        // optional, total in GHS pesewas
  "notes": string[],                    // optional
  "days": [
    {
      "day": number,
      "title": string,
      "items": [
        {
          "period": "morning" | "afternoon" | "evening",
          "kind": "TOUR" | "MEAL" | "FREE" | "TIP",
          "title": string,
          "description": string,
          "tourId": string,             // required only when kind is "TOUR"
          "estimatedCostMinor": number  // optional, GHS pesewas
        }
      ]
    }
  ]
}`;

@Injectable()
export class OpenRouterPlanner implements ItineraryPlannerPort {
  private readonly logger = new Logger(OpenRouterPlanner.name);
  private readonly http: AxiosInstance;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(config: ConfigService) {
    const c = config.get<AiConfig>('ai')!;
    this.apiKey = c.apiKey;
    this.model = c.model;
    this.timeoutMs = c.timeoutMs;
    this.http = axios.create({
      baseURL: c.baseUrl,
      timeout: c.timeoutMs,
      headers: {
        Authorization: `Bearer ${c.apiKey}`,
        'HTTP-Referer': 'https://voyago.app',
        'X-Title': 'Voyago',
      },
    });
    if (!this.apiKey) {
      this.logger.warn(
        'OpenRouter is not configured; AI itinerary planning is disabled',
      );
    }
  }

  async plan(req: PlannerRequest): Promise<PlannerResult> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException(
        'AI itinerary planning is not configured',
      );
    }

    const body = {
      model: this.model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: this.buildUserPrompt(req) },
      ],
    };

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const { data } = await this.http.post<ChatCompletion>(
          '/chat/completions',
          body,
          // AbortSignal enforces the deadline even when axios' own timeout does
          // not fire (e.g. a slow-streaming response held open by the provider).
          { signal: AbortSignal.timeout(this.timeoutMs) },
        );
        const content = data.choices?.[0]?.message?.content;
        if (!content) throw new Error('empty completion');
        const parsed = JSON.parse(content) as ModelItinerary;
        return {
          title: parsed.title ?? 'Your Ghana itinerary',
          model: this.model,
          plan: {
            summary: parsed.summary ?? '',
            estimatedTotalMinor: parsed.estimatedTotalMinor,
            notes: parsed.notes,
            days: parsed.days ?? [],
          },
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'unknown error';
        this.logger.warn(`OpenRouter attempt ${attempt} failed: ${message}`);
        if (attempt === 2) {
          throw new BadGatewayException('AI itinerary generation failed');
        }
      }
    }

    // Unreachable: the loop either returns or throws on the second attempt.
    throw new BadGatewayException('AI itinerary generation failed');
  }

  private buildUserPrompt(req: PlannerRequest): string {
    const tours = req.candidateTours.map((t) => ({
      id: t.id,
      title: t.title,
      destination: t.destinationName,
      priceMinorGHS: t.priceMinor,
      durationMinutes: t.durationMinutes,
    }));
    return JSON.stringify({
      destination: req.destination,
      days: req.days,
      partySize: req.partySize,
      budgetMinorGHS: req.budgetMinor,
      interests: req.interests,
      bookableTours: tours,
    });
  }
}
