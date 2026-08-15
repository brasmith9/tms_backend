import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bootstrapTestApp, tokenFor } from '../utils/test-db';
import { UserRole } from '../../src/modules/users/entities/user.entity';

const PHONE = '+233201110001';
const WHATSAPP = '233201110001';

describe('Campus food joints (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let adminToken: string;
  let vendorToken: string;
  let otherVendorToken: string;
  let touristToken: string;
  let locationId: string;
  let consentedId: string;
  let consentedSlug: string;
  let withheldSlug: string;

  const createJoint = async (
    token: string,
    over: Record<string, unknown> = {},
  ) => {
    const res = await request(server)
      .post('/api/v1/restaurants')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Bush Canteen Grill',
        cuisine: 'Ghanaian',
        priceTier: 1,
        description: 'Khebab and grilled chicken by the halls.',
        lat: 5.6557,
        lng: -0.1846,
        phone: PHONE,
        whatsapp: WHATSAPP,
        email: 'orders@bushcanteen.test',
        contactConsent: true,
        ...over,
      });
    return res;
  };

  beforeAll(async () => {
    app = await bootstrapTestApp();
    server = app.getHttpServer();
    adminToken = await tokenFor(app, 'food-admin@test.com', UserRole.ADMIN);
    vendorToken = await tokenFor(app, 'food-vendor@test.com', UserRole.VENDOR);
    otherVendorToken = await tokenFor(
      app,
      'food-vendor2@test.com',
      UserRole.VENDOR,
    );
    touristToken = await tokenFor(app, 'food-tourist@test.com');

    const loc = await request(server)
      .post('/api/v1/locations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        slug: 'e2e-commonwealth-hall',
        name: 'Commonwealth Hall',
        category: 'HOSTEL_HALL',
        lat: 5.654,
        lng: -0.1855,
      })
      .expect(201);
    locationId = loc.body.data.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('vendor write path', () => {
    it('lets a vendor create a joint and stamps them as owner', async () => {
      const res = await createJoint(vendorToken, {
        nearestLocationId: locationId,
      }).then((r) => {
        expect(r.status).toBe(201);
        return r;
      });

      consentedId = res.body.data.id;
      consentedSlug = res.body.data.slug;
      expect(res.body.data.nearestLocation).toMatchObject({
        id: locationId,
        slug: 'e2e-commonwealth-hall',
        name: 'Commonwealth Hall',
      });
    });

    it('rejects a create from a tourist', async () => {
      const res = await createJoint(touristToken, { name: 'Tourist Joint' });
      expect(res.status).toBe(403);
    });

    it('rejects an anonymous create', async () => {
      await request(server)
        .post('/api/v1/restaurants')
        .send({ name: 'Anon Joint' })
        .expect(401);
    });

    it('404s a create pointing at a campus location that does not exist', async () => {
      const res = await createJoint(vendorToken, {
        name: 'Ghost Joint',
        nearestLocationId: '11111111-1111-4111-8111-111111111111',
      });
      expect(res.status).toBe(404);
    });

    it('rejects a create with a malformed phone number', async () => {
      const res = await createJoint(vendorToken, {
        name: 'Bad Phone',
        phone: 'call me',
      });
      expect(res.status).toBe(400);
    });

    it('rejects a whatsapp number that is not digits only', async () => {
      const res = await createJoint(vendorToken, {
        name: 'Bad WhatsApp',
        whatsapp: '+233 20 111 0001',
      });
      expect(res.status).toBe(400);
    });

    it('accepts a listing with no contact details at all', async () => {
      const res = await createJoint(vendorToken, {
        name: 'No Contact Joint',
        phone: undefined,
        whatsapp: undefined,
        email: undefined,
        contactConsent: false,
      });
      expect(res.status).toBe(201);
    });

    it('lets a vendor read back only their own listings', async () => {
      const mine = await request(server)
        .get('/api/v1/restaurants/mine')
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(200);

      const slugs = (mine.body.data.results as { slug: string }[]).map(
        (r) => r.slug,
      );
      expect(slugs).toContain(consentedSlug);
      expect(mine.body.data).toMatchObject({ page: 1, pageSize: 20 });

      const theirs = await request(server)
        .get('/api/v1/restaurants/mine')
        .set('Authorization', `Bearer ${otherVendorToken}`)
        .expect(200);
      expect(theirs.body.data.total).toBe(0);
    });

    it('does not treat "mine" as a slug', async () => {
      // Route order matters: GET /restaurants/:slug would otherwise swallow it.
      await request(server).get('/api/v1/restaurants/mine').expect(401);
    });

    it('lets the owner patch their own joint', async () => {
      const res = await request(server)
        .patch(`/api/v1/restaurants/${consentedId}`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ description: 'Now open until midnight.' })
        .expect(200);

      expect(res.body.data.description).toBe('Now open until midnight.');
    });

    it('stops a vendor mutating a joint they do not own', async () => {
      await request(server)
        .patch(`/api/v1/restaurants/${consentedId}`)
        .set('Authorization', `Bearer ${otherVendorToken}`)
        .send({ description: 'Hijacked.' })
        .expect(403);
    });

    it('lets an admin act on any joint', async () => {
      await request(server)
        .patch(`/api/v1/restaurants/${consentedId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ priceTier: 2 })
        .expect(200);
    });

    it('replaces the menu, converting cedis to pesewas and back', async () => {
      const res = await request(server)
        .put(`/api/v1/restaurants/${consentedId}/menu`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          sections: [
            {
              category: 'Grill',
              items: [
                {
                  name: 'Beef khebab',
                  price: 20.5,
                  photoUrl: 'https://images.test/khebab.jpg',
                },
              ],
            },
          ],
        })
        .expect(200);

      expect(res.body.message).toBe('Menu updated');
      expect(res.body.data.sections[0].items[0]).toMatchObject({
        name: 'Beef khebab',
        price: 20.5,
        photoUrl: 'https://images.test/khebab.jpg',
      });

      const menu = await request(server)
        .get(`/api/v1/restaurants/${consentedId}/menu`)
        .expect(200);
      expect(menu.body.data.sections[0].items[0].price).toBe(20.5);
    });

    it('stops a non-owner replacing the menu', async () => {
      await request(server)
        .put(`/api/v1/restaurants/${consentedId}/menu`)
        .set('Authorization', `Bearer ${otherVendorToken}`)
        .send({ sections: [] })
        .expect(403);
    });
  });

  describe('contact consent gate', () => {
    beforeAll(async () => {
      const res = await createJoint(vendorToken, {
        name: 'Akuafo Hall Cafeteria',
        contactConsent: false,
      });
      expect(res.status).toBe(201);
      withheldSlug = res.body.data.slug;
    });

    it('publishes contact details for a consenting vendor', async () => {
      const res = await request(server)
        .get(`/api/v1/restaurants/${consentedSlug}`)
        .expect(200);

      expect(res.body.data).toMatchObject({
        contactConsent: true,
        phone: PHONE,
        whatsapp: WHATSAPP,
        email: 'orders@bushcanteen.test',
      });
    });

    it('withholds stored contact details when consent is false', async () => {
      const res = await request(server)
        .get(`/api/v1/restaurants/${withheldSlug}`)
        .expect(200);

      expect(res.body.data.contactConsent).toBe(false);
      expect(res.body.data.phone).toBeUndefined();
      expect(res.body.data.whatsapp).toBeUndefined();
      expect(res.body.data.email).toBeUndefined();
      // The number was stored on the row; it must not appear anywhere in the body.
      expect(JSON.stringify(res.body)).not.toContain(PHONE);
    });

    it('applies the gate on list results as well as detail', async () => {
      const res = await request(server)
        .get('/api/v1/restaurants?q=Akuafo')
        .expect(200);

      const withheld = (res.body.data.results as { slug: string }[]).find(
        (r) => r.slug === withheldSlug,
      );
      expect(withheld).toBeDefined();
      expect(JSON.stringify(withheld)).not.toContain(PHONE);
    });

    it('still withholds after the vendor revokes consent', async () => {
      await request(server)
        .patch(`/api/v1/restaurants/${consentedId}`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ contactConsent: false })
        .expect(200);

      const res = await request(server)
        .get(`/api/v1/restaurants/${consentedSlug}`)
        .expect(200);
      expect(res.body.data.phone).toBeUndefined();

      // Put it back for the remaining assertions.
      await request(server)
        .patch(`/api/v1/restaurants/${consentedId}`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ contactConsent: true })
        .expect(200);
    });
  });

  describe('campus area filtering', () => {
    it('filters by nearestLocationId', async () => {
      const res = await request(server)
        .get(`/api/v1/restaurants?nearestLocationId=${locationId}`)
        .expect(200);

      const slugs = (res.body.data.results as { slug: string }[]).map(
        (r) => r.slug,
      );
      expect(slugs).toContain(consentedSlug);
      expect(slugs).not.toContain(withheldSlug);
    });

    it('filters by nearestLocationSlug', async () => {
      const res = await request(server)
        .get('/api/v1/restaurants?nearestLocationSlug=e2e-commonwealth-hall')
        .expect(200);

      expect(
        (res.body.data.results as { slug: string }[]).map((r) => r.slug),
      ).toContain(consentedSlug);
    });

    it('finds a joint by the name of the landmark it sits by', async () => {
      const res = await request(server)
        .get('/api/v1/restaurants?q=Commonwealth')
        .expect(200);

      expect(
        (res.body.data.results as { slug: string }[]).map((r) => r.slug),
      ).toContain(consentedSlug);
    });
  });

  describe('reviews', () => {
    it('starts with an empty, correctly paginated list', async () => {
      const res = await request(server)
        .get(`/api/v1/restaurants/${consentedId}/reviews`)
        .expect(200);

      expect(res.body.data).toMatchObject({
        results: [],
        total: 0,
        page: 1,
        pageSize: 20,
      });
    });

    it('accepts a review from a tourist and folds it into the rating', async () => {
      const res = await request(server)
        .post(`/api/v1/restaurants/${consentedId}/reviews`)
        .set('Authorization', `Bearer ${touristToken}`)
        .send({ rating: 5, body: 'Best khebab on campus.' })
        .expect(201);

      expect(res.body.data).toMatchObject({
        restaurantId: consentedId,
        rating: 5,
      });
      // The reviewer is named, not just an opaque authorId.
      expect(res.body.data.author).toMatchObject({ fullName: 'Test User' });
      expect(res.body.data.authorId).toBeUndefined();

      const joint = await request(server)
        .get(`/api/v1/restaurants/${consentedSlug}`)
        .expect(200);
      expect(joint.body.data.ratingCount).toBe(1);
      expect(joint.body.data.ratingAvg).toBe(5);
    });

    it('rejects a second review from the same diner', async () => {
      await request(server)
        .post(`/api/v1/restaurants/${consentedId}/reviews`)
        .set('Authorization', `Bearer ${touristToken}`)
        .send({ rating: 3, body: 'Changed my mind.' })
        .expect(409);
    });

    it('rejects an anonymous review', async () => {
      await request(server)
        .post(`/api/v1/restaurants/${consentedId}/reviews`)
        .send({ rating: 4, body: 'Anonymous.' })
        .expect(401);
    });

    it('rejects a rating outside 1–5', async () => {
      await request(server)
        .post(`/api/v1/restaurants/${consentedId}/reviews`)
        .set('Authorization', `Bearer ${touristToken}`)
        .send({ rating: 9, body: 'Off the scale.' })
        .expect(400);
    });

    it('404s reviewing a restaurant that does not exist', async () => {
      await request(server)
        .post(
          '/api/v1/restaurants/11111111-1111-1111-1111-111111111111/reviews',
        )
        .set('Authorization', `Bearer ${touristToken}`)
        .send({ rating: 4, body: 'Ghost joint.' })
        .expect(404);
    });

    it('lists the review it stored', async () => {
      const res = await request(server)
        .get(`/api/v1/restaurants/${consentedId}/reviews`)
        .expect(200);

      expect(res.body.data.total).toBe(1);
      expect(res.body.data.results[0].body).toBe('Best khebab on campus.');
      expect(res.body.data.results[0].author).toMatchObject({
        fullName: 'Test User',
      });
    });

    it('lets an admin remove a review and recomputes the rating', async () => {
      const list = await request(server)
        .get(`/api/v1/restaurants/${consentedId}/reviews`)
        .expect(200);
      const reviewId = list.body.data.results[0].id as string;

      await request(server)
        .delete(`/api/v1/restaurants/${consentedId}/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${touristToken}`)
        .expect(403);

      const removed = await request(server)
        .delete(`/api/v1/restaurants/${consentedId}/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(removed.body.message).toBe('Review removed');

      const joint = await request(server)
        .get(`/api/v1/restaurants/${consentedSlug}`)
        .expect(200);
      expect(joint.body.data.ratingCount).toBe(0);
      expect(joint.body.data.ratingAvg).toBe(0);
    });

    it('leaves the tour review path untouched', async () => {
      // Tour reviews still live on their own booking-scoped route, still behind
      // their own guard — the new restaurant route did not displace them.
      await request(server)
        .post('/api/v1/bookings/TUR-2026-0001/review')
        .send({ rating: 5, body: 'x' })
        .expect(401);
    });
  });
});
