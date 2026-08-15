import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bootstrapTestApp, tokenFor } from '../utils/test-db';
import { UserRole } from '../../src/modules/users/entities/user.entity';
import { ASSISTANT_PORT } from '../../src/modules/assistant/assistant.port';
import type {
  AssistantPort,
  AssistantRequest,
  AssistantResult,
} from '../../src/modules/assistant/assistant.port';
import { NO_MATCH_REPLY } from '../../src/modules/assistant/assistant.service';

/**
 * A stub model that answers with whatever `nextResult` holds. It also records
 * the prompt it was given, so the tests can assert what the model was and was
 * not allowed to see.
 */
let nextResult: AssistantResult;
let lastRequest: AssistantRequest | undefined;

const fakeAssistant: AssistantPort = {
  reply: (req) => {
    lastRequest = req;
    return Promise.resolve(nextResult);
  },
  replyStream: (req, onDelta) => {
    lastRequest = req;
    onDelta(nextResult.reply.slice(0, 5));
    onDelta(nextResult.reply);
    return Promise.resolve(nextResult);
  },
};

describe('Campus assistant (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let adminToken: string;
  let vendorToken: string;
  let userToken: string;
  let otherToken: string;
  let hallSlug: string;
  let hallId: string;
  let jointSlug: string;

  beforeAll(async () => {
    app = await bootstrapTestApp((builder) =>
      builder.overrideProvider(ASSISTANT_PORT).useValue(fakeAssistant),
    );
    server = app.getHttpServer();
    adminToken = await tokenFor(app, 'ai-admin@test.com', UserRole.ADMIN);
    vendorToken = await tokenFor(app, 'ai-vendor@test.com', UserRole.VENDOR);
    userToken = await tokenFor(app, 'ai-user@test.com');
    otherToken = await tokenFor(app, 'ai-other@test.com');

    const loc = await request(server)
      .post('/api/v1/locations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        slug: 'ai-commonwealth-hall',
        name: 'Commonwealth Hall',
        category: 'HOSTEL_HALL',
        description: 'The all-male traditional hall of residence.',
        lat: 5.654,
        lng: -0.1855,
      })
      .expect(201);
    hallSlug = loc.body.data.slug;
    hallId = loc.body.data.id;

    const joint = await request(server)
      .post('/api/v1/restaurants')
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({
        name: 'Commonwealth Khebab',
        cuisine: 'Grill',
        priceTier: 1,
        description: 'Khebab grill by the hall.',
        lat: 5.6537,
        lng: -0.1852,
        phone: '+233201110006',
        contactConsent: false,
        nearestLocationId: hallId,
      })
      .expect(201);
    jointSlug = joint.body.data.slug;
  });

  beforeEach(() => {
    lastRequest = undefined;
    nextResult = {
      reply: 'Commonwealth Hall is on the ridge north-east of the Great Hall.',
      actions: [
        {
          type: 'OPEN_LOCATION',
          slug: 'ai-commonwealth-hall',
          name: 'Commonwealth Hall',
        },
      ],
      model: 'stub',
    };
  });

  afterAll(async () => {
    await app.close();
  });

  describe('guests', () => {
    it('answers an anonymous caller with a session id instead of 401', async () => {
      const res = await request(server)
        .post('/api/v1/assistant/chat')
        .send({ message: 'Where is Commonwealth Hall?' })
        .expect(200);

      expect(res.body).toMatchObject({ code: 200, message: 'OK' });
      expect(res.body.data.sessionId).toEqual(expect.any(String));
      expect(res.body.data.actions).toEqual([
        { type: 'OPEN_LOCATION', slug: hallSlug, name: 'Commonwealth Hall' },
      ]);
    });

    it('lets a guest continue their own session', async () => {
      const first = await request(server)
        .post('/api/v1/assistant/chat')
        .send({ message: 'Where is Commonwealth Hall?' })
        .expect(200);
      const sessionId = first.body.data.sessionId as string;

      const second = await request(server)
        .post('/api/v1/assistant/chat')
        .send({ sessionId, message: 'And Commonwealth Khebab?' })
        .expect(200);

      expect(second.body.data.sessionId).toBe(sessionId);
      // The prior turns were replayed to the model.
      expect(lastRequest!.history.length).toBeGreaterThan(0);
    });

    it('404s a guest holding a signed-in user’s session id', async () => {
      const mine = await request(server)
        .post('/api/v1/assistant/chat')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ message: 'Where is Commonwealth Hall?' })
        .expect(200);

      await request(server)
        .post('/api/v1/assistant/chat')
        .send({ sessionId: mine.body.data.sessionId, message: 'again' })
        .expect(404);
    });

    it('keeps the session endpoints auth-only', async () => {
      await request(server).get('/api/v1/assistant/sessions').expect(401);
      await request(server)
        .get('/api/v1/assistant/sessions/11111111-1111-4111-8111-111111111111')
        .expect(401);
      await request(server)
        .delete(
          '/api/v1/assistant/sessions/11111111-1111-4111-8111-111111111111',
        )
        .expect(401);
    });
  });

  describe('grounding', () => {
    it('says so plainly when nothing on campus matches, without calling the model', async () => {
      // No term here resolves to any seeded location or joint, so retrieval comes
      // back empty and the model is never given a chance to invent one.
      const res = await request(server)
        .post('/api/v1/assistant/chat')
        .send({ message: 'Where is Rivendell?' })
        .expect(200);

      expect(res.body.data.reply).toBe(NO_MATCH_REPLY);
      expect(res.body.data.actions).toEqual([]);
      expect(res.body.data.results).toBeUndefined();
      expect(lastRequest).toBeUndefined();
    });

    it('strips actions that point at records the model was never given', async () => {
      nextResult = {
        reply: 'Try the Commonwealth Hall area.',
        actions: [
          {
            type: 'OPEN_LOCATION',
            slug: 'ai-commonwealth-hall',
            name: 'Commonwealth Hall',
          },
          { type: 'OPEN_LOCATION', slug: 'invented-hall', name: 'Nowhere' },
          { type: 'SHOW_DIRECTIONS', lat: 51.5, lng: -0.12, name: 'Hogwarts' },
          { type: 'ORDER_TAKEAWAY', slug: jointSlug, name: 'x' },
        ],
        model: 'stub',
      };

      const res = await request(server)
        .post('/api/v1/assistant/chat')
        .send({ message: 'Commonwealth Hall' })
        .expect(200);

      expect(res.body.data.actions).toEqual([
        { type: 'OPEN_LOCATION', slug: hallSlug, name: 'Commonwealth Hall' },
      ]);
    });

    it('rewrites model-supplied coordinates from the real record', async () => {
      nextResult = {
        reply: 'Here are directions.',
        // London's coordinates, attached to a real campus hall.
        actions: [
          {
            type: 'SHOW_DIRECTIONS',
            lat: 51.5,
            lng: -0.12,
            name: 'Commonwealth Hall',
          },
        ],
        model: 'stub',
      };

      const res = await request(server)
        .post('/api/v1/assistant/chat')
        .send({ message: 'Directions to Commonwealth Hall' })
        .expect(200);

      expect(res.body.data.actions).toEqual([
        {
          type: 'SHOW_DIRECTIONS',
          lat: 5.654,
          lng: -0.1855,
          name: 'Commonwealth Hall',
        },
      ]);
    });

    it('grounds SAVE_FAVORITE against a real id', async () => {
      nextResult = {
        reply: 'Saved.',
        actions: [
          {
            type: 'SAVE_FAVORITE',
            favoriteType: 'LOCATION',
            itemId: hallId,
            name: 'Commonwealth Hall',
          },
          {
            type: 'SAVE_FAVORITE',
            favoriteType: 'LOCATION',
            itemId: '11111111-1111-4111-8111-111111111111',
            name: 'Ghost Hall',
          },
        ],
        model: 'stub',
      };

      const res = await request(server)
        .post('/api/v1/assistant/chat')
        .send({ message: 'Save Commonwealth Hall' })
        .expect(200);

      expect(res.body.data.actions).toEqual([
        {
          type: 'SAVE_FAVORITE',
          favoriteType: 'LOCATION',
          itemId: hallId,
          name: 'Commonwealth Hall',
        },
      ]);
    });

    it('returns results resolved from real records', async () => {
      const res = await request(server)
        .post('/api/v1/assistant/chat')
        .send({ message: 'Commonwealth Hall' })
        .expect(200);

      const group = (
        res.body.data.results as { kind: string; items: unknown[] }[]
      )[0];
      expect(group.kind).toBe('LOCATION');
      expect(group.items[0]).toMatchObject({
        slug: hallSlug,
        name: 'Commonwealth Hall',
        category: 'HOSTEL_HALL',
      });
    });

    it('refuses a contact action for a joint whose vendor withheld consent', async () => {
      nextResult = {
        reply: 'You can call them.',
        actions: [
          {
            type: 'CONTACT_FOOD_JOINT',
            slug: jointSlug,
            name: 'Commonwealth Khebab',
            channel: 'CALL',
          },
        ],
        model: 'stub',
      };

      const res = await request(server)
        .post('/api/v1/assistant/chat')
        .send({ message: 'Commonwealth Khebab' })
        .expect(200);

      expect(res.body.data.actions).toEqual([]);
      // And no channel was advertised to the model in the first place.
      expect(lastRequest!.candidateFoodJoints[0].contact).toEqual([]);
    });

    it('allows opening that same joint, which needs no contact details', async () => {
      nextResult = {
        reply: 'Here it is.',
        actions: [
          {
            type: 'OPEN_FOOD_JOINT',
            slug: jointSlug,
            name: 'Commonwealth Khebab',
          },
        ],
        model: 'stub',
      };

      const res = await request(server)
        .post('/api/v1/assistant/chat')
        .send({ message: 'Commonwealth Khebab' })
        .expect(200);

      expect(res.body.data.actions).toEqual([
        {
          type: 'OPEN_FOOD_JOINT',
          slug: jointSlug,
          name: 'Commonwealth Khebab',
        },
      ]);
    });
  });

  describe('SSE streaming', () => {
    it('streams deltas then a grounded done event', async () => {
      const res = await request(server)
        .post('/api/v1/assistant/chat/stream')
        .send({ message: 'Where is Commonwealth Hall?' })
        .expect(200)
        .expect('Content-Type', /text\/event-stream/);

      const frames = res.text.trim().split('\n\n');
      expect(frames.filter((f) => f.startsWith('event: delta')).length).toBe(2);

      const done = frames.find((f) => f.startsWith('event: done'))!;
      const payload = JSON.parse(done.slice(done.indexOf('data: ') + 6));
      expect(payload.sessionId).toEqual(expect.any(String));
      expect(payload.actions).toEqual([
        { type: 'OPEN_LOCATION', slug: hallSlug, name: 'Commonwealth Hall' },
      ]);
    });
  });

  describe('history', () => {
    let sessionId: string;

    it('records the turn under the signed-in user', async () => {
      const res = await request(server)
        .post('/api/v1/assistant/chat')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ message: 'Where is Commonwealth Hall?' })
        .expect(200);
      sessionId = res.body.data.sessionId;

      const list = await request(server)
        .get('/api/v1/assistant/sessions')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(list.body.data).toMatchObject({ page: 1, pageSize: 20 });
      expect(
        (list.body.data.results as { id: string }[]).map((s) => s.id),
      ).toContain(sessionId);
    });

    it('returns the session with both turns and the stored actions', async () => {
      const res = await request(server)
        .get(`/api/v1/assistant/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const messages = res.body.data.messages as {
        role: string;
        actions: unknown[];
      }[];
      expect(messages.map((m) => m.role)).toEqual(['USER', 'ASSISTANT']);
      expect(messages[1].actions).toEqual([
        { type: 'OPEN_LOCATION', slug: hallSlug, name: 'Commonwealth Hall' },
      ]);
    });

    it('does not leak another user’s session', async () => {
      await request(server)
        .get(`/api/v1/assistant/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);

      await request(server)
        .delete(`/api/v1/assistant/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
    });

    it('clears history on delete', async () => {
      const res = await request(server)
        .delete(`/api/v1/assistant/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body).toMatchObject({
        message: 'Chat history cleared',
        data: null,
      });

      await request(server)
        .get(`/api/v1/assistant/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
  });

  it('rejects an empty message', async () => {
    await request(server)
      .post('/api/v1/assistant/chat')
      .send({ message: '' })
      .expect(400);
  });
});
