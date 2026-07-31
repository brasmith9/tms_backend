import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { ResponseEnvelopeInterceptor } from '../../src/common/interceptors/response-envelope.interceptor';
import { UserRole } from '../../src/modules/users/entities/user.entity';

/**
 * Boots the full application against the throwaway test database (NODE_ENV=test
 * makes DatabaseModule synchronize + dropSchema each run) with the same global
 * pipes/filters as production.
 */
import type { TestingModuleBuilder } from '@nestjs/testing';

/** Applies the same global pipes/filters/versioning as production main.ts. */
export function applyTestGlobals(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(
    new ResponseEnvelopeInterceptor(reflector),
    new ClassSerializerInterceptor(reflector),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
}

export async function bootstrapTestApp(
  configure?: (builder: TestingModuleBuilder) => TestingModuleBuilder,
): Promise<INestApplication> {
  process.env.NODE_ENV = 'test';
  // Point the app at the throwaway test database BEFORE the config module loads
  // its .env — in test mode DatabaseModule drops the schema each boot, so it must
  // never run against the dev database. dotenv does not override an already-set var.
  process.env.DATABASE_URL =
    process.env.TEST_DATABASE_URL ??
    'postgres://voyago:voyago@localhost:5545/voyago_test';
  let builder = Test.createTestingModule({ imports: [AppModule] });
  if (configure) builder = configure(builder);
  const moduleRef = await builder.compile();

  const app = moduleRef.createNestApplication({ rawBody: true });
  applyTestGlobals(app);
  await app.init();
  return app;
}

export function dataSourceOf(app: INestApplication): DataSource {
  return app.get(DataSource);
}

/** Registers a user, optionally promotes their role, and returns an access token. */
export async function tokenFor(
  app: INestApplication,
  email: string,
  role: UserRole = UserRole.TOURIST,
): Promise<string> {
  const server = app.getHttpServer();
  await request(server)
    .post('/api/v1/auth/register')
    .send({ email, password: 'password123', fullName: 'Test User' });

  if (role !== UserRole.TOURIST) {
    await dataSourceOf(app).query(
      'UPDATE users SET role = $1 WHERE email = $2',
      [role, email],
    );
  }

  const login = await request(server)
    .post('/api/v1/auth/login')
    .send({ email, password: 'password123' });
  return login.body.data.accessToken as string;
}

/**
 * Seeds an APPROVED tour with a single departure of the given capacity and
 * returns the departure id. Goes through the real API so guards and workflow
 * transitions are exercised end to end.
 */
export async function seedApprovedTourWithDeparture(
  app: INestApplication,
  capacity: number,
): Promise<{ departureId: string; tourId: string }> {
  const server = app.getHttpServer();
  const stamp = `${capacity}-${Math.round(process.hrtime()[1])}`;

  const operatorToken = await tokenFor(
    app,
    `operator-${stamp}@test.com`,
    UserRole.OPERATOR,
  );
  const adminToken = await tokenFor(
    app,
    `admin-${stamp}@test.com`,
    UserRole.ADMIN,
  );

  const dest = await request(server)
    .post('/api/v1/destinations')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: `Dest ${stamp}`, region: 'Central', description: 'x' });

  const tour = await request(server)
    .post('/api/v1/tours')
    .set('Authorization', `Bearer ${operatorToken}`)
    .send({
      title: `Tour ${stamp}`,
      destinationId: dest.body.data.id,
      description: 'a tour',
      priceMinor: 12000,
      durationMinutes: 120,
    });
  const tourId = tour.body.data.id as string;

  await request(server)
    .post(`/api/v1/tours/${tourId}/submit`)
    .set('Authorization', `Bearer ${operatorToken}`);
  await request(server)
    .post(`/api/v1/tours/${tourId}/approve`)
    .set('Authorization', `Bearer ${adminToken}`);

  const departure = await request(server)
    .post(`/api/v1/tours/${tourId}/departures`)
    .set('Authorization', `Bearer ${operatorToken}`)
    .send({ departsAt: '2027-01-01T08:30:00.000Z', capacity });

  return { departureId: departure.body.data.id as string, tourId };
}
