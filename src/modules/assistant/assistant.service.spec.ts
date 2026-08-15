import { NotFoundException } from '@nestjs/common';
import { Restaurant } from '../food/entities/restaurant.entity';
import { FoodRepository } from '../food/food.repository';
import {
  Location,
  LocationCategory,
} from '../locations/entities/location.entity';
import { LocationsRepository } from '../locations/locations.repository';
import type {
  AssistantPort,
  AssistantRequest,
  AssistantResult,
} from './assistant.port';
import { AssistantRepository } from './assistant.repository';
import {
  AssistantService,
  NO_MATCH_REPLY,
  searchTerms,
} from './assistant.service';
import { ChatRole } from './entities/chat-message.entity';
import { ChatSession } from './entities/chat-session.entity';

const location = (over: Partial<Location> = {}): Location =>
  ({
    id: 'loc-1',
    slug: 'commonwealth-hall',
    name: 'Commonwealth Hall',
    category: LocationCategory.HOSTEL_HALL,
    lat: 5.654,
    lng: -0.1855,
    photos: [],
    ...over,
  }) as Location;

const restaurant = (over: Partial<Restaurant> = {}): Restaurant =>
  ({
    id: 'rest-1',
    slug: 'bush-canteen-grill',
    name: 'Bush Canteen Grill',
    cuisine: 'Ghanaian',
    priceTier: 1,
    description: 'x',
    lat: 5.6558,
    lng: -0.1848,
    images: [],
    dietary: [],
    openingHours: [],
    menu: [],
    ratingAvg: 4,
    ratingCount: 3,
    contactConsent: false,
    ...over,
  }) as Restaurant;

describe('AssistantService', () => {
  let repo: Record<string, jest.Mock>;
  let locations: Record<string, jest.Mock>;
  let food: Record<string, jest.Mock>;
  let port: Record<string, jest.Mock>;
  let service: AssistantService;

  const modelSays = (over: Partial<AssistantResult> = {}): AssistantResult => ({
    reply: 'Commonwealth Hall is on the ridge north-east of the Great Hall.',
    actions: [
      {
        type: 'OPEN_LOCATION',
        slug: 'commonwealth-hall',
        name: 'Commonwealth Hall',
      },
    ],
    model: 'test-model',
    ...over,
  });

  beforeEach(() => {
    repo = {
      createSession: jest.fn((userId: string | null, title: string) =>
        Promise.resolve({ id: 'sess-1', userId, title } as ChatSession),
      ),
      findSessionById: jest.fn(),
      findSessionsForUser: jest.fn().mockResolvedValue([[], 0]),
      touchSession: jest.fn().mockResolvedValue(undefined),
      removeSession: jest.fn().mockResolvedValue(undefined),
      addMessage: jest.fn().mockResolvedValue(undefined),
      findMessages: jest.fn().mockResolvedValue([]),
    };
    locations = { search: jest.fn().mockResolvedValue([]) };
    food = { search: jest.fn().mockResolvedValue([]) };
    port = {
      reply: jest.fn().mockResolvedValue(modelSays()),
      replyStream: jest.fn().mockResolvedValue(modelSays()),
    };
    service = new AssistantService(
      repo as unknown as AssistantRepository,
      locations as unknown as LocationsRepository,
      food as unknown as FoodRepository,
      port as unknown as AssistantPort,
    );
  });

  describe('guests', () => {
    it('issues an unowned session id instead of rejecting an anonymous caller', async () => {
      locations.search.mockResolvedValue([location()]);

      const reply = await service.chat(null, {
        message: 'Where is Commonwealth Hall?',
      });

      expect(reply.sessionId).toBe('sess-1');
      expect(repo.createSession).toHaveBeenCalledWith(
        null,
        'Where is Commonwealth Hall?',
      );
    });

    it('lets a guest continue an unowned session', async () => {
      locations.search.mockResolvedValue([location()]);
      repo.findSessionById.mockResolvedValue({
        id: 'sess-1',
        userId: null,
      });

      await expect(
        service.chat(null, {
          sessionId: 'sess-1',
          message: 'And the library?',
        }),
      ).resolves.toMatchObject({ sessionId: 'sess-1' });
    });

    it('404s a guest holding a signed-in user’s session id', async () => {
      repo.findSessionById.mockResolvedValue({
        id: 'sess-1',
        userId: 'user-9',
      });

      await expect(
        service.chat(null, { sessionId: 'sess-1', message: 'hi' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('404s a signed-in user continuing someone else’s session', async () => {
      repo.findSessionById.mockResolvedValue({
        id: 'sess-1',
        userId: 'user-9',
      });

      await expect(
        service.chat('user-1', { sessionId: 'sess-1', message: 'hi' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('grounding', () => {
    it('never calls the model when retrieval finds nothing', async () => {
      const reply = await service.chat(null, {
        message: 'Where is the Hogwarts Hall of Residence?',
      });

      expect(port.reply).not.toHaveBeenCalled();
      expect(reply.reply).toBe(NO_MATCH_REPLY);
      expect(reply.actions).toEqual([]);
      expect(reply.results).toBeUndefined();
      // The turn is still recorded, so history stays honest.
      expect(repo.addMessage).toHaveBeenCalledWith(
        'sess-1',
        ChatRole.ASSISTANT,
        NO_MATCH_REPLY,
      );
    });

    it('drops actions pointing at records the model was never given', async () => {
      locations.search.mockResolvedValue([location()]);
      port.reply.mockResolvedValue(
        modelSays({
          actions: [
            {
              type: 'OPEN_LOCATION',
              slug: 'commonwealth-hall',
              name: 'Commonwealth Hall',
            },
            { type: 'OPEN_LOCATION', slug: 'invented-hall', name: 'Nowhere' },
            { type: 'OPEN_FOOD_JOINT', slug: 'never-seen', name: 'Ghost' },
          ],
        }),
      );

      const reply = await service.chat(null, { message: 'Commonwealth Hall?' });

      expect(reply.actions).toEqual([
        {
          type: 'OPEN_LOCATION',
          slug: 'commonwealth-hall',
          name: 'Commonwealth Hall',
        },
      ]);
    });

    it('withholds a contact action when the vendor did not consent', async () => {
      food.search.mockResolvedValue([
        restaurant({ contactConsent: false, phone: '+233201234567' }),
      ]);
      port.reply.mockResolvedValue(
        modelSays({
          actions: [
            {
              type: 'CONTACT_FOOD_JOINT',
              slug: 'bush-canteen-grill',
              name: 'Bush Canteen Grill',
              channel: 'CALL',
            },
          ],
        }),
      );

      const reply = await service.chat(null, { message: 'Bush Canteen Grill' });

      expect(reply.actions).toEqual([]);
    });

    it('tells the model no contact channel exists without consent', async () => {
      food.search.mockResolvedValue([
        restaurant({ contactConsent: false, phone: '+233201234567' }),
      ]);

      await service.chat(null, { message: 'Bush Canteen Grill' });

      const req = port.reply.mock.calls[0][0] as AssistantRequest;
      expect(req.candidateFoodJoints[0].contact).toEqual([]);
      // The number itself never reaches the model either way.
      expect(JSON.stringify(req)).not.toContain('+233201234567');
    });

    it('advertises the channels a consenting vendor published', async () => {
      food.search.mockResolvedValue([
        restaurant({
          contactConsent: true,
          phone: '+233201234567',
          whatsapp: '233201234567',
        }),
      ]);

      await service.chat(null, { message: 'Bush Canteen Grill' });

      const req = port.reply.mock.calls[0][0] as AssistantRequest;
      expect(req.candidateFoodJoints[0].contact).toEqual(['CALL', 'WHATSAPP']);
      expect(JSON.stringify(req)).not.toContain('+233201234567');
    });

    it('returns results only for records an action actually points at', async () => {
      locations.search.mockResolvedValue([
        location(),
        location({ id: 'loc-2', slug: 'balme-library', name: 'Balme Library' }),
      ]);

      const reply = await service.chat(null, {
        message: 'Commonwealth Hall or Balme Library?',
      });

      expect(reply.results).toHaveLength(1);
      expect(reply.results![0].kind).toBe('LOCATION');
      expect(reply.results![0].items).toHaveLength(1);
      expect(reply.results![0].items[0]).toMatchObject({
        slug: 'commonwealth-hall',
      });
    });

    it('falls back to the no-match text when the model returns empty prose', async () => {
      locations.search.mockResolvedValue([location()]);
      port.reply.mockResolvedValue(modelSays({ reply: '   ', actions: [] }));

      const reply = await service.chat(null, { message: 'Commonwealth Hall' });

      expect(reply.reply).toBe(NO_MATCH_REPLY);
    });

    it('persists the grounded actions, not the raw model output', async () => {
      locations.search.mockResolvedValue([location()]);
      port.reply.mockResolvedValue(
        modelSays({
          actions: [
            {
              type: 'OPEN_LOCATION',
              slug: 'commonwealth-hall',
              name: 'Commonwealth Hall',
            },
            { type: 'OPEN_LOCATION', slug: 'invented-hall', name: 'Nowhere' },
          ],
        }),
      );

      await service.chat(null, { message: 'Commonwealth Hall' });

      expect(repo.addMessage).toHaveBeenCalledWith(
        'sess-1',
        ChatRole.ASSISTANT,
        expect.any(String),
        [
          {
            type: 'OPEN_LOCATION',
            slug: 'commonwealth-hall',
            name: 'Commonwealth Hall',
          },
        ],
      );
    });
  });

  describe('streaming', () => {
    it('grounds the streamed turn the same way as the synchronous one', async () => {
      locations.search.mockResolvedValue([location()]);
      port.replyStream.mockImplementation(
        (_req: AssistantRequest, onDelta: (t: string) => void) => {
          onDelta('Commonwealth');
          onDelta('Commonwealth Hall is on the ridge.');
          return Promise.resolve(
            modelSays({
              actions: [
                {
                  type: 'OPEN_LOCATION',
                  slug: 'commonwealth-hall',
                  name: 'Commonwealth Hall',
                },
                {
                  type: 'OPEN_LOCATION',
                  slug: 'invented-hall',
                  name: 'Nowhere',
                },
              ],
            }),
          );
        },
      );
      const deltas: string[] = [];

      const reply = await service.chatStream(
        null,
        { message: 'Commonwealth Hall?' },
        (t) => deltas.push(t),
      );

      expect(deltas).toEqual([
        'Commonwealth',
        'Commonwealth Hall is on the ridge.',
      ]);
      expect(reply.actions).toEqual([
        {
          type: 'OPEN_LOCATION',
          slug: 'commonwealth-hall',
          name: 'Commonwealth Hall',
        },
      ]);
    });
  });

  describe('sessions', () => {
    it('404s reading a session belonging to someone else', async () => {
      repo.findSessionById.mockResolvedValue({
        id: 'sess-1',
        userId: 'user-9',
      });

      await expect(
        service.getSession('sess-1', 'user-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('404s deleting a guest session, which has no owner to match', async () => {
      repo.findSessionById.mockResolvedValue({
        id: 'sess-1',
        userId: null,
      });

      await expect(
        service.removeSession('sess-1', 'user-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.removeSession).not.toHaveBeenCalled();
    });

    it('deletes a session the caller owns', async () => {
      const session = { id: 'sess-1', userId: 'user-1' } as ChatSession;
      repo.findSessionById.mockResolvedValue(session);

      await service.removeSession('sess-1', 'user-1');

      expect(repo.removeSession).toHaveBeenCalledWith(session);
    });
  });
});

describe('searchTerms', () => {
  it('keeps content words and drops stopwords', () => {
    expect(searchTerms('Where is the Balme Library?')).toEqual([
      'library',
      'balme',
    ]);
  });

  it('returns nothing for a question made only of stopwords', () => {
    expect(searchTerms('where can I go?')).toEqual([]);
  });

  it('caps the number of terms', () => {
    expect(
      searchTerms('commonwealth akuafo sarbah volta legon computer business'),
    ).toHaveLength(5);
  });
});
