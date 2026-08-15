import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bootstrapTestApp, tokenFor } from '../utils/test-db';
import { UserRole } from '../../src/modules/users/entities/user.entity';

// Balme Library forecourt, used as the "I am here" origin.
const ORIGIN = { lat: 5.6508, lng: -0.1869 };

describe('Campus locations (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let adminToken: string;
  let touristToken: string;
  let createdId: string;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    server = app.getHttpServer();
    adminToken = await tokenFor(app, 'loc-admin@test.com', UserRole.ADMIN);
    touristToken = await tokenFor(app, 'loc-tourist@test.com');
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a location as admin and returns it in the envelope', async () => {
    const res = await request(server)
      .post('/api/v1/locations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        slug: 'e2e-balme-library',
        name: 'Balme Library',
        category: 'ADMINISTRATION',
        description: 'The main university library.',
        lat: ORIGIN.lat,
        lng: ORIGIN.lng,
        buildingNotes: 'Faces the Great Hall.',
      })
      .expect(201);

    expect(res.body).toMatchObject({ code: 201, message: 'Created' });
    expect(res.body.data).toMatchObject({
      slug: 'e2e-balme-library',
      category: 'ADMINISTRATION',
      photos: [],
    });
    expect(res.body.data.distanceKm).toBeUndefined();
    createdId = res.body.data.id;
  });

  it('rejects a location write from a non-admin', async () => {
    await request(server)
      .post('/api/v1/locations')
      .set('Authorization', `Bearer ${touristToken}`)
      .send({
        slug: 'e2e-nope',
        name: 'Nope',
        category: 'OTHER',
        lat: ORIGIN.lat,
        lng: ORIGIN.lng,
      })
      .expect(403);
  });

  it('rejects an anonymous location write', async () => {
    await request(server)
      .post('/api/v1/locations')
      .send({
        slug: 'e2e-anon',
        name: 'Anon',
        category: 'OTHER',
        lat: ORIGIN.lat,
        lng: ORIGIN.lng,
      })
      .expect(401);
  });

  it('rejects a category outside the closed enum', async () => {
    await request(server)
      .post('/api/v1/locations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        slug: 'e2e-bad-category',
        name: 'Bad',
        category: 'NIGHTCLUB',
        lat: ORIGIN.lat,
        lng: ORIGIN.lng,
      })
      .expect(400);
  });

  it('rejects a duplicate slug with 409', async () => {
    await request(server)
      .post('/api/v1/locations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        slug: 'e2e-balme-library',
        name: 'Balme Library again',
        category: 'OTHER',
        lat: ORIGIN.lat,
        lng: ORIGIN.lng,
      })
      .expect(409);
  });

  it('fetches a location by slug, not by id', async () => {
    const res = await request(server)
      .get('/api/v1/locations/e2e-balme-library')
      .expect(200);

    expect(res.body.data.name).toBe('Balme Library');
    expect(res.body.data.buildingNotes).toBe('Faces the Great Hall.');
  });

  it('404s an unknown slug', async () => {
    await request(server).get('/api/v1/locations/not-a-place').expect(404);
  });

  it('paginates with the shared pagination shape', async () => {
    const res = await request(server)
      .get('/api/v1/locations?page=1&limit=10')
      .expect(200);

    expect(res.body.data).toMatchObject({ page: 1, pageSize: 10 });
    expect(Array.isArray(res.body.data.results)).toBe(true);
    expect(typeof res.body.data.total).toBe('number');
    expect(typeof res.body.data.totalPages).toBe('number');
  });

  describe('distance', () => {
    beforeAll(async () => {
      await request(server)
        .post('/api/v1/locations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          slug: 'e2e-far-field',
          name: 'Far Field',
          category: 'PARK_FIELD',
          // ~10km away, well outside any campus radius.
          lat: 5.74,
          lng: -0.12,
        })
        .expect(201);
    });

    it('omits distanceKm when no origin is supplied', async () => {
      const res = await request(server)
        .get('/api/v1/locations?q=Balme')
        .expect(200);

      expect(res.body.data.results[0].distanceKm).toBeUndefined();
    });

    it('adds distanceKm and sorts nearest first when lat/lng are supplied', async () => {
      const res = await request(server)
        .get(`/api/v1/locations?lat=${ORIGIN.lat}&lng=${ORIGIN.lng}`)
        .expect(200);

      const results = res.body.data.results as {
        slug: string;
        distanceKm: number;
      }[];
      expect(results[0].slug).toBe('e2e-balme-library');
      expect(results[0].distanceKm).toBeCloseTo(0, 1);
      expect(results[0].distanceKm).toBeLessThan(
        results[results.length - 1].distanceKm,
      );
    });

    it('filters by radiusKm', async () => {
      const res = await request(server)
        .get(`/api/v1/locations?lat=${ORIGIN.lat}&lng=${ORIGIN.lng}&radiusKm=1`)
        .expect(200);

      const slugs = (res.body.data.results as { slug: string }[]).map(
        (r) => r.slug,
      );
      expect(slugs).toContain('e2e-balme-library');
      expect(slugs).not.toContain('e2e-far-field');
    });

    it('filters by category', async () => {
      const res = await request(server)
        .get('/api/v1/locations?category=PARK_FIELD')
        .expect(200);

      const categories = (res.body.data.results as { category: string }[]).map(
        (r) => r.category,
      );
      expect(categories.length).toBeGreaterThan(0);
      expect(new Set(categories)).toEqual(new Set(['PARK_FIELD']));
    });

    it('searches name and description with q', async () => {
      const res = await request(server)
        .get('/api/v1/locations?q=university%20library')
        .expect(200);

      expect(
        (res.body.data.results as { slug: string }[]).map((r) => r.slug),
      ).toContain('e2e-balme-library');
    });
  });

  describe('campus affiliations (SRS 2.3)', () => {
    it('registers a student with the role they declared', async () => {
      const res = await request(server)
        .post('/api/v1/auth/register')
        .send({
          email: 'fresher@ug.edu.gh',
          password: 'password123',
          fullName: 'Ama Student',
          affiliation: 'STUDENT',
        })
        .expect(201);

      const me = await request(server)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${res.body.data.accessToken}`)
        .expect(200);
      expect(me.body.data.role).toBe('STUDENT');
    });

    it('still defaults to TOURIST when no affiliation is sent', async () => {
      const res = await request(server)
        .post('/api/v1/auth/register')
        .send({
          email: 'no-affiliation@test.com',
          password: 'password123',
          fullName: 'No Affiliation',
        })
        .expect(201);

      const me = await request(server)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${res.body.data.accessToken}`)
        .expect(200);
      expect(me.body.data.role).toBe('TOURIST');
    });

    it('refuses a self-declared VENDOR or ADMIN', async () => {
      for (const affiliation of ['VENDOR', 'ADMIN', 'OPERATOR']) {
        await request(server)
          .post('/api/v1/auth/register')
          .send({
            email: `escalate-${affiliation}@test.com`,
            password: 'password123',
            fullName: 'Escalation Attempt',
            affiliation,
          })
          .expect(400);
      }
    });

    it('lets a student review a campus food joint', async () => {
      const studentLogin = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: 'fresher@ug.edu.gh', password: 'password123' })
        .expect(200);
      const vendorToken = await tokenFor(
        app,
        'loc-vendor@test.com',
        UserRole.VENDOR,
      );

      const joint = await request(server)
        .post('/api/v1/restaurants')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          name: 'Student Reviewable Joint',
          cuisine: 'Ghanaian',
          priceTier: 1,
          description: 'x',
          lat: 5.65,
          lng: -0.187,
          contactConsent: false,
        })
        .expect(201);

      await request(server)
        .post(`/api/v1/restaurants/${joint.body.data.id}/reviews`)
        .set('Authorization', `Bearer ${studentLogin.body.data.accessToken}`)
        .send({ rating: 5, body: 'Cheapest waakye near the halls.' })
        .expect(201);
    });
  });

  describe('reference sets', () => {
    it('serves the campus category sets so the client stops hardcoding them', async () => {
      const res = await request(server)
        .get('/api/v1/reference/location-categories')
        .expect(200);

      expect((res.body.data as { code: string }[]).map((i) => i.code)).toEqual([
        'LECTURE_HALL',
        'DEPARTMENT',
        'PARK_FIELD',
        'HOSTEL_HALL',
        'ADMINISTRATION',
        'OTHER',
      ]);

      await request(server)
        .get('/api/v1/reference/food-categories')
        .expect(200);
    });
  });

  describe('saving a campus location', () => {
    it('accepts LOCATION as a favourite type', async () => {
      const created = await request(server)
        .post('/api/v1/locations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          slug: 'e2e-saveable-hall',
          name: 'Saveable Hall',
          category: 'HOSTEL_HALL',
          lat: 5.65,
          lng: -0.186,
          photos: ['https://images.test/hall.jpg'],
        })
        .expect(201);

      const fav = await request(server)
        .post('/api/v1/favorites')
        .set('Authorization', `Bearer ${touristToken}`)
        .send({ type: 'LOCATION', itemId: created.body.data.id })
        .expect(201);

      // Snapshotted so /saved renders without a per-item fetch.
      expect(fav.body.data.item).toMatchObject({
        title: 'Saveable Hall',
        slug: 'e2e-saveable-hall',
        imageUrl: 'https://images.test/hall.jpg',
      });
    });

    it('404s saving a location that does not exist', async () => {
      await request(server)
        .post('/api/v1/favorites')
        .set('Authorization', `Bearer ${touristToken}`)
        .send({
          type: 'LOCATION',
          itemId: '11111111-1111-4111-8111-111111111111',
        })
        .expect(404);
    });
  });

  it('updates and then deletes a location as admin', async () => {
    await request(server)
      .patch(`/api/v1/locations/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: 'Now with a new reading room.' })
      .expect(200);

    const updated = await request(server)
      .get('/api/v1/locations/e2e-balme-library')
      .expect(200);
    expect(updated.body.data.description).toBe('Now with a new reading room.');

    const removed = await request(server)
      .delete(`/api/v1/locations/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(removed.body).toMatchObject({
      message: 'Location deleted',
      data: null,
    });

    await request(server)
      .get('/api/v1/locations/e2e-balme-library')
      .expect(404);
  });
});
