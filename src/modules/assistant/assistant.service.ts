import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  Paginated,
  applyPagination,
  paginate,
} from '../../common/pagination/paginate';
import { RestaurantQueryDto } from '../food/dto/restaurant-query.dto';
import { RestaurantResponseDto } from '../food/dto/restaurant-response.dto';
import { Restaurant } from '../food/entities/restaurant.entity';
import { FoodRepository } from '../food/food.repository';
import { isOpenAt } from '../food/opening-hours';
import { LocationQueryDto } from '../locations/dto/location-query.dto';
import { LocationResponseDto } from '../locations/dto/location-response.dto';
import { Location } from '../locations/entities/location.entity';
import { LocationsRepository } from '../locations/locations.repository';
import {
  AssistantAction,
  GroundedPlace,
  GroundingIndex,
  groundActions,
} from './assistant-action';
import { ASSISTANT_PORT } from './assistant.port';
import type {
  AssistantPort,
  AssistantRequest,
  AssistantResult,
  CandidateFoodJoint,
  CandidateLocation,
} from './assistant.port';
import { AssistantRepository } from './assistant.repository';
import { AssistantResultGroupDto, ChatReplyDto } from './dto/chat-reply.dto';
import { ChatRequestDto } from './dto/chat.dto';
import { ChatSessionResponseDto } from './dto/chat-session-response.dto';
import { ChatMessage, ChatRole } from './entities/chat-message.entity';
import { ChatSession } from './entities/chat-session.entity';

/** How many prior turns to replay to the model. */
const HISTORY_TURNS = 10;
/** Cap on records handed to the model per kind. */
const CANDIDATE_LIMIT = 12;

/**
 * Said verbatim when retrieval finds nothing. The model is not called at all on
 * this path, which is what makes "never fabricate a hall, price or opening
 * time" a property of the system rather than a hope about the prompt.
 */
export const NO_MATCH_REPLY =
  'I could not find anything on the University of Ghana, Legon campus matching that. ' +
  'I can help with campus locations — lecture halls, departments, halls of residence, ' +
  'fields and administration buildings — and with campus food joints. Try naming one of those.';

@Injectable()
export class AssistantService {
  constructor(
    private readonly repo: AssistantRepository,
    private readonly locations: LocationsRepository,
    private readonly food: FoodRepository,
    @Inject(ASSISTANT_PORT) private readonly assistant: AssistantPort,
  ) {}

  /** `userId` is null for a guest; the session is then simply unowned. */
  async chat(
    userId: string | null,
    dto: ChatRequestDto,
  ): Promise<ChatReplyDto> {
    return this.runTurn(userId, dto, (req) => this.assistant.reply(req));
  }

  /** Same turn, but prose is pushed to `onDelta` as the model produces it. */
  async chatStream(
    userId: string | null,
    dto: ChatRequestDto,
    onDelta: (text: string) => void,
  ): Promise<ChatReplyDto> {
    return this.runTurn(userId, dto, (req) =>
      this.assistant.replyStream(req, onDelta),
    );
  }

  async listSessions(
    userId: string,
    q: PaginationQueryDto,
  ): Promise<Paginated<ChatSessionResponseDto>> {
    const { skip, take } = applyPagination(q);
    const [rows, total] = await this.repo.findSessionsForUser(
      userId,
      skip,
      take,
    );
    return paginate(
      rows.map((s) => ChatSessionResponseDto.from(s)),
      total,
      q,
    );
  }

  async getSession(
    id: string,
    userId: string,
  ): Promise<ChatSessionResponseDto> {
    const session = await this.ownedSessionOrThrow(id, userId);
    return ChatSessionResponseDto.from(
      session,
      await this.repo.findMessages(id),
    );
  }

  async removeSession(id: string, userId: string): Promise<void> {
    await this.repo.removeSession(await this.ownedSessionOrThrow(id, userId));
  }

  // --- turn pipeline -----------------------------------------------------

  private async runTurn(
    userId: string | null,
    dto: ChatRequestDto,
    ask: (req: AssistantRequest) => Promise<AssistantResult>,
  ): Promise<ChatReplyDto> {
    const session = await this.resolveSession(userId, dto);
    const history = await this.historyFor(session.id);

    const { locations, restaurants } = await this.retrieve(dto.message);

    await this.repo.addMessage(session.id, ChatRole.USER, dto.message);

    // Nothing real to talk about — answer from the fixed string and skip the
    // model entirely, so there is no opportunity to invent one.
    if (locations.length === 0 && restaurants.length === 0) {
      await this.repo.addMessage(
        session.id,
        ChatRole.ASSISTANT,
        NO_MATCH_REPLY,
      );
      await this.repo.touchSession(session.id);
      return { sessionId: session.id, reply: NO_MATCH_REPLY, actions: [] };
    }

    const result = await ask({
      message: dto.message,
      history,
      candidateLocations: locations.map(toCandidateLocation),
      candidateFoodJoints: restaurants.map((r) => toCandidateFoodJoint(r)),
    });

    const actions = groundActions(
      result.actions,
      buildGroundingIndex(locations, restaurants),
    );
    const reply = result.reply.trim() || NO_MATCH_REPLY;

    await this.repo.addMessage(session.id, ChatRole.ASSISTANT, reply, actions);
    await this.repo.touchSession(session.id);

    return {
      sessionId: session.id,
      reply,
      actions,
      results: this.buildResults(locations, restaurants, actions),
    };
  }

  /**
   * Retrieval over the real tables. Everything the model is later allowed to
   * name comes from here, so this is the only place campus knowledge enters.
   */
  private async retrieve(
    message: string,
  ): Promise<{ locations: Location[]; restaurants: Restaurant[] }> {
    const terms = searchTerms(message);
    if (terms.length === 0) return { locations: [], restaurants: [] };

    const locationsById = new Map<string, Location>();
    const restaurantsById = new Map<string, Restaurant>();

    for (const term of terms) {
      const [locs, rests] = await Promise.all([
        this.locations.search(
          Object.assign(new LocationQueryDto(), { q: term }),
        ),
        this.food.search(Object.assign(new RestaurantQueryDto(), { q: term })),
      ]);
      for (const l of locs) locationsById.set(l.id, l);
      for (const r of rests) restaurantsById.set(r.id, r);
    }

    return {
      locations: [...locationsById.values()].slice(0, CANDIDATE_LIMIT),
      restaurants: [...restaurantsById.values()].slice(0, CANDIDATE_LIMIT),
    };
  }

  /** Only records an action actually points at are echoed back as results. */
  private buildResults(
    locations: Location[],
    restaurants: Restaurant[],
    actions: AssistantAction[],
  ): AssistantResultGroupDto[] | undefined {
    // SHOW_DIRECTIONS carries only a name, so it is matched by name below.
    const directionNames = new Set(
      actions.flatMap((a) => (a.type === 'SHOW_DIRECTIONS' ? [a.name] : [])),
    );
    const locationKeys = new Set(
      actions.flatMap((a) =>
        a.type === 'OPEN_LOCATION'
          ? [a.slug]
          : a.type === 'SAVE_FAVORITE' && a.favoriteType === 'LOCATION'
            ? [a.itemId]
            : [],
      ),
    );
    const restaurantKeys = new Set(
      actions.flatMap((a) =>
        a.type === 'OPEN_FOOD_JOINT' || a.type === 'CONTACT_FOOD_JOINT'
          ? [a.slug]
          : a.type === 'SAVE_FAVORITE' && a.favoriteType === 'FOOD_JOINT'
            ? [a.itemId]
            : [],
      ),
    );

    const groups: AssistantResultGroupDto[] = [];
    const matchedLocations = locations.filter(
      (l) =>
        locationKeys.has(l.slug) ||
        locationKeys.has(l.id) ||
        directionNames.has(l.name),
    );
    if (matchedLocations.length > 0) {
      groups.push({
        kind: 'LOCATION',
        items: matchedLocations.map((l) => LocationResponseDto.from(l)),
      });
    }

    const matchedRestaurants = restaurants.filter(
      (r) =>
        restaurantKeys.has(r.slug) ||
        restaurantKeys.has(r.id) ||
        directionNames.has(r.name),
    );
    if (matchedRestaurants.length > 0) {
      const now = new Date();
      groups.push({
        kind: 'FOOD_JOINT',
        items: matchedRestaurants.map((r) =>
          RestaurantResponseDto.from(r, isOpenAt(r.openingHours, now)),
        ),
      });
    }

    return groups.length > 0 ? groups : undefined;
  }

  // --- sessions ----------------------------------------------------------

  private async resolveSession(
    userId: string | null,
    dto: ChatRequestDto,
  ): Promise<ChatSession> {
    if (!dto.sessionId) {
      return this.repo.createSession(userId, dto.message.slice(0, 120));
    }
    const session = await this.repo.findSessionById(dto.sessionId);
    // A signed-in caller owns their sessions; a guest may only continue an
    // unowned one, so holding a session id never reveals someone's history.
    // 404 rather than 403 for someone else's, per api-requirements.md §0 —
    // a 403 would confirm the session exists.
    if (!session || (session.userId ?? null) !== userId) {
      throw new NotFoundException('Chat session not found');
    }
    return session;
  }

  private async ownedSessionOrThrow(
    id: string,
    userId: string,
  ): Promise<ChatSession> {
    const session = await this.repo.findSessionById(id);
    if (!session || session.userId !== userId) {
      throw new NotFoundException('Chat session not found');
    }
    return session;
  }

  private async historyFor(sessionId: string) {
    const messages = await this.repo.findMessages(sessionId);
    return messages.slice(-HISTORY_TURNS).map((m: ChatMessage) => ({
      role:
        m.role === ChatRole.USER ? ('USER' as const) : ('ASSISTANT' as const),
      content: m.content,
    }));
  }
}

const toCandidateLocation = (l: Location): CandidateLocation => ({
  id: l.id,
  slug: l.slug,
  name: l.name,
  category: l.category,
  lat: l.lat,
  lng: l.lng,
  buildingNotes: l.buildingNotes,
});

const toCandidateFoodJoint = (r: Restaurant): CandidateFoodJoint => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  cuisine: r.cuisine,
  priceTier: r.priceTier,
  lat: r.lat,
  lng: r.lng,
  // The consent gate reaches the prompt too: without consent the model is told
  // no channel exists, so it cannot offer to call. The number itself never goes.
  contact: r.contactConsent
    ? ([
        ...(r.phone ? (['CALL'] as const) : []),
        ...(r.whatsapp ? (['WHATSAPP'] as const) : []),
      ] as ('CALL' | 'WHATSAPP')[])
    : [],
});

function buildGroundingIndex(
  locations: Location[],
  restaurants: Restaurant[],
): GroundingIndex {
  return {
    locations: locations.map((l): GroundedPlace => ({
      id: l.id,
      slug: l.slug,
      name: l.name,
      lat: l.lat,
      lng: l.lng,
    })),
    foodJoints: restaurants.map((r): GroundedPlace => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      lat: r.lat,
      lng: r.lng,
      canCall: Boolean(r.contactConsent && r.phone),
      canWhatsApp: Boolean(r.contactConsent && r.whatsapp),
    })),
  };
}

const STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'is',
  'are',
  'was',
  'were',
  'to',
  'of',
  'in',
  'on',
  'at',
  'for',
  'and',
  'or',
  'but',
  'where',
  'what',
  'who',
  'how',
  'can',
  'i',
  'me',
  'my',
  'you',
  'it',
  'do',
  'does',
  'did',
  'get',
  'find',
  'near',
  'nearby',
  'show',
  'tell',
  'please',
  'there',
  'here',
  'from',
  'with',
  'about',
  'any',
  'some',
  'best',
  'good',
  'eat',
  'go',
  'want',
  'need',
  'this',
  'that',
]);

/** Content words worth searching on, longest first so specific names win. */
export function searchTerms(message: string): string[] {
  return [
    ...new Set(
      message
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length > 2 && !STOPWORDS.has(t)),
    ),
  ]
    .sort((a, b) => b.length - a.length)
    .slice(0, 5);
}
