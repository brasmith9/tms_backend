import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { IncomingMessage } from 'http';
import {
  AssistantPort,
  AssistantRequest,
  AssistantResult,
} from './assistant.port';

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
interface ModelReply {
  reply?: string;
  actions?: unknown;
}

const SYSTEM_PROMPT = `You are CampusPal, the assistant for the University of Ghana, Legon campus.

You are given a list of REAL campus locations and REAL campus food joints. These are the only
places that exist for you. Rules you must follow exactly:

- Never mention a hall, department, field, restaurant or chop bar that is not in the lists.
- Never invent a price, an opening time, a phone number or a distance. If a fact is not in the
  lists, say you do not have it.
- If the lists do not answer the question, say so plainly and suggest what the user could ask
  instead. Do not guess.
- Reference places by their exact "name", and use their exact "id"/"slug" in actions.
- Only emit CONTACT_FOOD_JOINT with a "channel" that appears in that joint's "contact" array. An
  empty array means the vendor has not consented to being contacted — do not offer it at all.
- Every location and food joint listed carries "lat" and "lng". Use those exact values for
  SHOW_DIRECTIONS — you always have coordinates, so never say you lack them.
- If the question is outside campus navigation and food, answer plainly with an empty "actions".

Respond with ONLY a JSON object of this shape:
{
  "reply": string,          // your answer in plain prose, no markdown
  "actions": [              // may be empty
    { "type": "OPEN_LOCATION", "slug": string, "name": string }
    | { "type": "OPEN_FOOD_JOINT", "slug": string, "name": string }
    | { "type": "SHOW_DIRECTIONS", "lat": number, "lng": number, "name": string }
    | { "type": "CONTACT_FOOD_JOINT", "slug": string, "name": string,
        "channel": "CALL" | "WHATSAPP" }
    | { "type": "SAVE_FAVORITE", "favoriteType": "LOCATION" | "FOOD_JOINT",
        "itemId": string, "name": string }
  ]
}`;

@Injectable()
export class OpenRouterAssistant implements AssistantPort {
  private readonly logger = new Logger(OpenRouterAssistant.name);
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
        'X-Title': 'Voyago CampusPal',
      },
    });
    if (!this.apiKey) {
      this.logger.warn(
        'OpenRouter is not configured; the campus assistant is disabled',
      );
    }
  }

  async reply(req: AssistantRequest): Promise<AssistantResult> {
    this.assertConfigured();
    try {
      const { data } = await this.http.post<ChatCompletion>(
        '/chat/completions',
        this.body(req, false),
        { signal: AbortSignal.timeout(this.timeoutMs) },
      );
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error('empty completion');
      return this.toResult(content);
    } catch (err) {
      this.logger.warn(`OpenRouter chat failed: ${describe(err)}`);
      throw new BadGatewayException('The campus assistant is unavailable');
    }
  }

  async replyStream(
    req: AssistantRequest,
    onDelta: (text: string) => void,
  ): Promise<AssistantResult> {
    this.assertConfigured();
    let buffered = '';
    try {
      const { data } = await this.http.post<IncomingMessage>(
        '/chat/completions',
        this.body(req, true),
        { responseType: 'stream', signal: AbortSignal.timeout(this.timeoutMs) },
      );

      for await (const delta of readDeltas(data)) {
        buffered += delta;
        // The wire format is a JSON object, so the raw deltas are JSON syntax.
        // Emitting only the growing "reply" string keeps the client from having
        // to parse a half-written object.
        const prose = partialReply(buffered);
        if (prose !== undefined) onDelta(prose);
      }

      if (!buffered) throw new Error('empty completion');
      return this.toResult(buffered);
    } catch (err) {
      this.logger.warn(`OpenRouter chat stream failed: ${describe(err)}`);
      throw new BadGatewayException('The campus assistant is unavailable');
    }
  }

  private assertConfigured(): void {
    if (!this.apiKey) {
      throw new ServiceUnavailableException(
        'The campus assistant is not configured',
      );
    }
  }

  private body(req: AssistantRequest, stream: boolean) {
    return {
      model: this.model,
      stream,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...req.history.map((t) => ({
          role: t.role === 'USER' ? 'user' : 'assistant',
          content: t.content,
        })),
        { role: 'user', content: this.buildUserPrompt(req) },
      ],
    };
  }

  private toResult(content: string): AssistantResult {
    const parsed = JSON.parse(content) as ModelReply;
    return {
      reply: typeof parsed.reply === 'string' ? parsed.reply : '',
      actions: parsed.actions,
      model: this.model,
    };
  }

  private buildUserPrompt(req: AssistantRequest): string {
    return JSON.stringify({
      question: req.message,
      campusLocations: req.candidateLocations,
      campusFoodJoints: req.candidateFoodJoints,
    });
  }
}

const describe = (err: unknown): string =>
  err instanceof Error ? err.message : 'unknown error';

/** Yields the `content` deltas out of an OpenAI-style SSE completion stream. */
async function* readDeltas(stream: IncomingMessage): AsyncGenerator<string> {
  let carry = '';
  for await (const chunk of stream) {
    carry += (chunk as Buffer).toString('utf8');
    const lines = carry.split('\n');
    // The final element may be a partial line; hold it for the next chunk.
    carry = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === '[DONE]') return;
      try {
        const parsed = JSON.parse(payload) as {
          choices?: { delta?: { content?: string } }[];
        };
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {
        // A chunk that is not valid JSON is a keep-alive or a provider comment.
        continue;
      }
    }
  }
}

/**
 * Pulls the value of `"reply"` out of a JSON object that is still being written.
 * Returns undefined until the key has actually started, so the client never sees
 * brace noise.
 */
export function partialReply(buffered: string): string | undefined {
  const key = buffered.indexOf('"reply"');
  if (key === -1) return undefined;
  const colon = buffered.indexOf(':', key + '"reply"'.length);
  if (colon === -1) return undefined;
  const open = buffered.indexOf('"', colon + 1);
  if (open === -1) return undefined;

  let out = '';
  for (let i = open + 1; i < buffered.length; i++) {
    const ch = buffered[i];
    if (ch === '\\') {
      const next = buffered[i + 1];
      if (next === undefined) break; // escape split across chunks
      out += ESCAPES[next] ?? next;
      i++;
      continue;
    }
    if (ch === '"') break; // string closed — the reply is complete
    out += ch;
  }
  return out;
}

const ESCAPES: Record<string, string> = {
  n: '\n',
  t: '\t',
  r: '\r',
  '"': '"',
  '\\': '\\',
  '/': '/',
};
