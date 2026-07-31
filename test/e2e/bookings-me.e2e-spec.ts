import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  bootstrapTestApp,
  seedApprovedTourWithDeparture,
  tokenFor,
} from '../utils/test-db';

/**
 * Regression: GET /bookings/me used to 500 on every call because its query
 * joined tour_departures (uuid id) against tour_bookings.departure_id (varchar)
 * with no cast. It must return 200 — even for an account with no bookings — and
 * embed a tour summary so trips render without per-booking tour fetches.
 */
describe('GET /bookings/me (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await bootstrapTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns an empty page (not 500) for an account with no bookings', async () => {
    const token = await tokenFor(app, 'empty-trips@test.com');
    const res = await request(app.getHttpServer())
      .get('/api/v1/bookings/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.results).toEqual([]);
    expect(res.body.data.total).toBe(0);
  });

  it('embeds the tour summary in each booking', async () => {
    const server = app.getHttpServer();
    const { departureId } = await seedApprovedTourWithDeparture(app, 10);
    const token = await tokenFor(app, 'booker@test.com');

    await request(server)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ departureId, seats: 2 })
      .expect(201);

    const res = await request(server)
      .get('/api/v1/bookings/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.results).toHaveLength(1);
    const booking = res.body.data.results[0];
    expect(booking.item).toBeDefined();
    expect(booking.item.title).toMatch(/^Tour /);
    expect(booking.item.slug).toEqual(expect.any(String));
    expect(booking.item.startsAt).toEqual(expect.any(String));
  });
});
