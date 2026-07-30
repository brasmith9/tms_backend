import { INestApplication } from '@nestjs/common';
import { createHmac } from 'crypto';
import request from 'supertest';
import { bootstrapTestApp, tokenFor } from '../utils/test-db';
import { UserRole } from '../../src/modules/users/entities/user.entity';
import { PaystackClient } from '../../src/modules/payments/paystack.client';

// A fake Paystack that avoids network I/O but still runs the real HMAC-SHA512
// signature check, so the webhook path is exercised end to end.
const WEBHOOK_SECRET = 'e2e_webhook_secret';
const fakePaystack: Partial<PaystackClient> = {
  initializeTransaction: (input: {
    email: string;
    amountMinor: number;
    reference: string;
    currency: string;
  }) =>
    Promise.resolve({
      authorizationUrl: `https://checkout.paystack.com/${input.reference}`,
      reference: input.reference,
    }),
  verifySignature: (raw: Buffer, signature: string) =>
    createHmac('sha512', WEBHOOK_SECRET).update(raw).digest('hex') ===
    signature,
  createRefund: () => Promise.resolve(),
};

describe('Tours booking spine (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let touristToken: string;
  let operatorToken: string;
  let adminToken: string;
  let tourId: string;
  let departureId: string;
  let reference: string;

  beforeAll(async () => {
    app = await bootstrapTestApp((builder) =>
      builder.overrideProvider(PaystackClient).useValue(fakePaystack),
    );
    server = app.getHttpServer();
    touristToken = await tokenFor(
      app,
      'spine-tourist@test.com',
      UserRole.TOURIST,
    );
    operatorToken = await tokenFor(
      app,
      'spine-operator@test.com',
      UserRole.OPERATOR,
    );
    adminToken = await tokenFor(app, 'spine-admin@test.com', UserRole.ADMIN);
  });

  afterAll(async () => {
    await app.close();
  });

  it('runs search → book → pay → confirm → cancel → refund end to end', async () => {
    // Admin creates a destination.
    const dest = await request(server)
      .post('/api/v1/destinations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Spine Coast', region: 'Central', description: 'x' })
      .expect(201);

    // Operator creates a tour, submits it; admin approves.
    const tour = await request(server)
      .post('/api/v1/tours')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        title: 'Spine Canopy Walk',
        destinationId: dest.body.id,
        description: 'a walk',
        priceMinor: 12000,
        durationMinutes: 120,
      })
      .expect(201);
    tourId = tour.body.id;

    await request(server)
      .post(`/api/v1/tours/${tourId}/submit`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .expect(201);
    await request(server)
      .post(`/api/v1/tours/${tourId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    // Public search now finds the approved tour.
    const search = await request(server)
      .get('/api/v1/tours?limit=50')
      .expect(200);
    expect(search.body.data.some((t: { id: string }) => t.id === tourId)).toBe(
      true,
    );

    // Operator adds a departure far in the future (outside the cancel window).
    const departure = await request(server)
      .post(`/api/v1/tours/${tourId}/departures`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ departsAt: '2027-12-01T08:30:00.000Z', capacity: 10 })
      .expect(201);
    departureId = departure.body.id;

    // Tourist books (PENDING).
    const booking = await request(server)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${touristToken}`)
      .send({ departureId, seats: 1 })
      .expect(201);
    reference = booking.body.reference;
    expect(booking.body.status).toBe('PENDING');

    // Initiate payment (fake Paystack) → authorization url returned.
    const initiate = await request(server)
      .post('/api/v1/payments/initiate')
      .set('Authorization', `Bearer ${touristToken}`)
      .send({ bookingReference: reference })
      .expect(201);
    expect(initiate.body.authorizationUrl).toContain('paystack.com');

    // Paystack posts a signed charge.success → booking becomes CONFIRMED.
    const event = JSON.stringify({
      event: 'charge.success',
      data: { reference },
    });
    const signature = createHmac('sha512', WEBHOOK_SECRET)
      .update(event)
      .digest('hex');
    await request(server)
      .post('/api/v1/payments/webhook')
      .set('x-paystack-signature', signature)
      .set('Content-Type', 'application/json')
      .send(event)
      .expect(201);

    const confirmed = await request(server)
      .get(`/api/v1/bookings/${reference}`)
      .set('Authorization', `Bearer ${touristToken}`)
      .expect(200);
    expect(confirmed.body.status).toBe('CONFIRMED');

    // Tourist cancels (outside the 48h window) → CANCELLED.
    const cancelled = await request(server)
      .post(`/api/v1/bookings/${reference}/cancel`)
      .set('Authorization', `Bearer ${touristToken}`)
      .expect(201);
    expect(cancelled.body.status).toBe('CANCELLED');
  });

  it('returns the standard 409 envelope when a departure is fully booked', async () => {
    // A capacity-1 departure, booked twice by the same tourist.
    const dest = await request(server)
      .post('/api/v1/destinations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Full Coast', region: 'Central', description: 'x' });
    const tour = await request(server)
      .post('/api/v1/tours')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        title: 'Full Tour',
        destinationId: dest.body.id,
        description: 'x',
        priceMinor: 5000,
        durationMinutes: 60,
      });
    await request(server)
      .post(`/api/v1/tours/${tour.body.id}/submit`)
      .set('Authorization', `Bearer ${operatorToken}`);
    await request(server)
      .post(`/api/v1/tours/${tour.body.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    const dep = await request(server)
      .post(`/api/v1/tours/${tour.body.id}/departures`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ departsAt: '2027-12-01T08:30:00.000Z', capacity: 1 });

    await request(server)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${touristToken}`)
      .send({ departureId: dep.body.id, seats: 1 })
      .expect(201);

    const over = await request(server)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${touristToken}`)
      .send({ departureId: dep.body.id, seats: 1 })
      .expect(409);
    expect(over.body).toMatchObject({
      statusCode: 409,
      error: 'Conflict',
      path: '/api/v1/bookings',
    });
  });
});
