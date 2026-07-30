import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  bootstrapTestApp,
  seedApprovedTourWithDeparture,
  tokenFor,
} from '../utils/test-db';
import { UserRole } from '../../src/modules/users/entities/user.entity';

describe('Booking concurrency (e2e)', () => {
  let app: INestApplication;
  let departureId: string;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    ({ departureId } = await seedApprovedTourWithDeparture(app, 1));
    tokenA = await tokenFor(app, 'racer-a@test.com', UserRole.TOURIST);
    tokenB = await tokenFor(app, 'racer-b@test.com', UserRole.TOURIST);
  });

  afterAll(async () => {
    await app.close();
  });

  it('lets exactly one of two racing bookings take the last seat', async () => {
    const book = (token: string) =>
      request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({ departureId, seats: 1 });

    const [ra, rb] = await Promise.all([book(tokenA), book(tokenB)]);
    const statuses = [ra.status, rb.status].sort((x, y) => x - y);
    expect(statuses).toEqual([201, 409]);
  });
});
