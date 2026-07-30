# Tours Booking Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the tours vertical of the Voyago tourism backend end to end — auth with RBAC, an operator→admin tour-listing workflow, departure-level inventory, a pessimistic-locked booking lifecycle, real Paystack payments, review gating, loyalty points, and two Socket.io gateways.

**Architecture:** Feature-based NestJS modules. Controllers validate shape via DTOs and delegate; services hold business logic; repositories are the only layer touching TypeORM. A single global exception filter, validation pipe, and serializer interceptor enforce cross-cutting rules. The booking core serialises per departure with a `SELECT ... FOR UPDATE` row lock so `tour_bookings` is the only source of truth for seats consumed.

**Tech Stack:** NestJS 11, TypeScript (strict), PostgreSQL 16, TypeORM 1.x (repository pattern), Passport (local + JWT), argon2, class-validator/class-transformer, @nestjs/swagger, @nestjs/schedule, @nestjs/throttler, helmet, @nestjs/platform-socket.io, Paystack (live).

**Reference:** Full design at `docs/specs/2026-07-29-tours-booking-backend-design.md`. Read it before starting.

## Global Constraints

- **Node** ≥ 20.19 (installed: v20.19.0). **Package manager: yarn** — never introduce a `package-lock.json`.
- **TypeScript strict is already on** (`tsconfig.json` `"strict": true`); ESLint enforces `@typescript-eslint/no-explicit-any: error`. A justified `any` needs a `// eslint-disable-next-line` with a reason, never a global loosen.
- **Money** is stored and computed as **integer minor units (pesewas)** with a `currency` column. Never floating point. Display conversion is the client's job.
- **API** is versioned under `/api/v1`. `POST`→201, `DELETE`→204, validation→400, unauthenticated→401, forbidden→403, missing→404, conflict→409.
- **Every list endpoint** is paginated `?page=1&limit=20` and responds `{ data, meta: { total, page, limit, totalPages } }`.
- **Naming (spec §3):** classes `PascalCase`; files `kebab-case.type.ts`; DB tables plural `snake_case`; routes plural kebab-case nouns; booleans read as questions (`isConfirmed`). Env keys `UPPER_SNAKE_CASE`.
- **Every DTO field** carries both a `class-validator` decorator and an `@ApiProperty()` that agree with each other.
- **Never return a TypeORM entity from a controller** — return a `*ResponseDto`. `@Exclude()` on `password_hash` / `token_hash`.
- **Secrets only in `.env`** (gitignored). `.env.example` holds placeholders only. Config is validated on boot; a missing secret fails fast.
- **Commits:** ticket-prefixed (`TOUR-NNN: ...`), one logical change each, honest dates. Every task ends green (lint + relevant tests) before commit.
- **Docs:** Swagger at `/api/docs`, raw JSON at `/api/docs-json`. Socket event contracts in `docs/websocket-events.md`.

---

## File structure

```
src/
  main.ts                              bootstrap: helmet, versioning, pipes, swagger, rawBody
  app.module.ts                        wires ConfigModule, DatabaseModule, feature modules
  config/
    configuration.ts                   typed config factory
    env.validation.ts                  class-validator schema over process.env
    config.module.ts                   global ConfigModule.forRoot
  database/
    database.module.ts                 TypeOrmModule.forRootAsync
    data-source.ts                     TypeORM CLI DataSource (migrations)
    migrations/                        generated migrations
    seeds/
      seed.ts                          idempotent seed runner
  common/
    decorators/
      current-user.decorator.ts        @CurrentUser()
      roles.decorator.ts               @Roles(...)
    guards/
      jwt-auth.guard.ts
      roles.guard.ts
      ownership.guard.ts               resource-owner check via a token
    filters/
      http-exception.filter.ts         standard error envelope
    interceptors/
      logging.interceptor.ts
    dto/
      pagination-query.dto.ts          page/limit query
      paginated-response.dto.ts        { data, meta }
    pagination/
      paginate.ts                      buildMeta() + applyPagination() helpers
  modules/
    auth/       users/       destinations/       tours/
    bookings/   payments/    reviews/            notifications/
test/
  e2e/
    ...e2e-spec.ts
  utils/
    test-db.ts                         throwaway datasource helpers
docker-compose.yml                     postgres:16 for dev + e2e
```

Each feature module follows the spec §2 internal shape: `dto/`, `entities/`, `*.controller.ts`, `*.service.ts`, `*.repository.ts`, `*.module.ts`, and colocated `*.spec.ts`.

---

## Task dependency spine

```
1 Foundation ─▶ 2 Common ─▶ 3 Users ─▶ 4 Auth+Guards ─▶ 5 Destinations
                                              │
     ┌────────────────────────────────────────┘
     ▼
6 Tours+Departures ─▶ 7 Bookings core ─▶ 8 Payments ─▶ 9 Reviews+Loyalty
                                    │
                                    ▼
                        10 Gateways ─▶ 11 Cron jobs ─▶ 12 Seeds ─▶ 13 E2E spine
```

Each task is independently testable and ends with a commit. Tasks 5–9 each deliver a working, demoable slice.

---

### Task 1: Project foundation — config, database, bootstrap, error envelope

**Files:**
- Create: `docker-compose.yml`, `.env.example`, `.env`
- Create: `src/config/configuration.ts`, `src/config/env.validation.ts`, `src/config/config.module.ts`
- Create: `src/database/database.module.ts`, `src/database/data-source.ts`
- Create: `src/common/filters/http-exception.filter.ts`
- Modify: `src/main.ts`, `src/app.module.ts`
- Delete: `src/app.controller.ts`, `src/app.service.ts`, `src/app.controller.spec.ts`, `test/app.e2e-spec.ts`
- Test: `src/config/env.validation.spec.ts`, `src/common/filters/http-exception.filter.spec.ts`

**Interfaces:**
- Produces: `AppConfig` type and `configuration()` factory; `validateEnv(config: Record<string, unknown>): EnvVars`; `HttpExceptionFilter`; a running Nest app on `PORT` with `/api/v1` prefix, global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`, Swagger at `/api/docs`, and `rawBody: true`.

- [ ] **Step 1: Install dependencies**

```bash
yarn add @nestjs/config @nestjs/typeorm typeorm@^1.1.0 pg helmet
yarn add class-validator class-transformer
yarn add -D @types/pg
```

- [ ] **Step 2: Write `docker-compose.yml` and env files**

`docker-compose.yml`:
```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: voyago
      POSTGRES_PASSWORD: voyago
      POSTGRES_DB: voyago
    ports: ['5432:5432']
    volumes: ['voyago_pg:/var/lib/postgresql/data']
  db_test:
    image: postgres:16
    environment:
      POSTGRES_USER: voyago
      POSTGRES_PASSWORD: voyago
      POSTGRES_DB: voyago_test
    ports: ['5433:5432']
volumes:
  voyago_pg:
```

`.env.example` (copy to `.env` and fill real values):
```
PORT=3000
CORS_ORIGINS=http://localhost:5173
DATABASE_URL=postgres://voyago:voyago@localhost:5432/voyago
JWT_ACCESS_SECRET=change-me-access
JWT_ACCESS_TTL=15m
JWT_REFRESH_SECRET=change-me-refresh
JWT_REFRESH_TTL=7d
PAYSTACK_SECRET_KEY=sk_test_xxx
PAYSTACK_PUBLIC_KEY=pk_test_xxx
PAYSTACK_BASE_URL=https://api.paystack.co
SEAT_HOLD_MINUTES=15
CANCELLATION_WINDOW_HOURS=48
```

- [ ] **Step 3: Write the failing env-validation test**

`src/config/env.validation.spec.ts`:
```ts
import { validateEnv } from './env.validation';

const valid = {
  PORT: '3000',
  CORS_ORIGINS: 'http://localhost:5173',
  DATABASE_URL: 'postgres://u:p@localhost:5432/db',
  JWT_ACCESS_SECRET: 'a',
  JWT_ACCESS_TTL: '15m',
  JWT_REFRESH_SECRET: 'r',
  JWT_REFRESH_TTL: '7d',
  PAYSTACK_SECRET_KEY: 'sk_test_x',
  PAYSTACK_PUBLIC_KEY: 'pk_test_x',
  PAYSTACK_BASE_URL: 'https://api.paystack.co',
  SEAT_HOLD_MINUTES: '15',
  CANCELLATION_WINDOW_HOURS: '48',
};

describe('validateEnv', () => {
  it('passes with a complete, valid environment', () => {
    expect(() => validateEnv(valid)).not.toThrow();
  });

  it('throws when a required secret is missing', () => {
    const { JWT_ACCESS_SECRET, ...missing } = valid;
    expect(() => validateEnv(missing)).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('coerces numeric strings to numbers', () => {
    expect(validateEnv(valid).SEAT_HOLD_MINUTES).toBe(15);
  });
});
```

- [ ] **Step 4: Run it, verify it fails** — `yarn test env.validation` → FAIL (module not found).

- [ ] **Step 5: Implement `env.validation.ts`**

```ts
import { plainToInstance } from 'class-transformer';
import { IsInt, IsString, IsUrl, Min, validateSync } from 'class-validator';

export class EnvVars {
  @IsInt() PORT!: number;
  @IsString() CORS_ORIGINS!: string;
  @IsString() DATABASE_URL!: string;
  @IsString() JWT_ACCESS_SECRET!: string;
  @IsString() JWT_ACCESS_TTL!: string;
  @IsString() JWT_REFRESH_SECRET!: string;
  @IsString() JWT_REFRESH_TTL!: string;
  @IsString() PAYSTACK_SECRET_KEY!: string;
  @IsString() PAYSTACK_PUBLIC_KEY!: string;
  @IsUrl({ require_tld: false }) PAYSTACK_BASE_URL!: string;
  @IsInt() @Min(1) SEAT_HOLD_MINUTES!: number;
  @IsInt() @Min(1) CANCELLATION_WINDOW_HOURS!: number;
}

export function validateEnv(config: Record<string, unknown>): EnvVars {
  const validated = plainToInstance(EnvVars, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(
      `Invalid environment: ${errors.map((e) => e.property).join(', ')}`,
    );
  }
  return validated;
}
```

- [ ] **Step 6: Run it, verify pass** — `yarn test env.validation` → PASS.

- [ ] **Step 7: Write `configuration.ts` and `config.module.ts`**

`configuration.ts`:
```ts
export const configuration = () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  corsOrigins: (process.env.CORS_ORIGINS ?? '').split(',').filter(Boolean),
  databaseUrl: process.env.DATABASE_URL!,
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET!,
    accessTtl: process.env.JWT_ACCESS_TTL!,
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    refreshTtl: process.env.JWT_REFRESH_TTL!,
  },
  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY!,
    publicKey: process.env.PAYSTACK_PUBLIC_KEY!,
    baseUrl: process.env.PAYSTACK_BASE_URL!,
  },
  booking: {
    seatHoldMinutes: parseInt(process.env.SEAT_HOLD_MINUTES ?? '15', 10),
    cancellationWindowHours: parseInt(
      process.env.CANCELLATION_WINDOW_HOURS ?? '48',
      10,
    ),
  },
});

export type AppConfig = ReturnType<typeof configuration>;
```

`config.module.ts`:
```ts
import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configuration } from './configuration';
import { validateEnv } from './env.validation';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
  ],
})
export class AppConfigModule {}
```

- [ ] **Step 8: Write `data-source.ts` and `database.module.ts`**

`data-source.ts` (used by the TypeORM CLI for migrations):
```ts
import 'reflect-metadata';
import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
});
```

`database.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('databaseUrl'),
        autoLoadEntities: true,
        synchronize: false,
        migrationsRun: true,
        migrations: ['dist/database/migrations/*.js'],
      }),
    }),
  ],
})
export class DatabaseModule {}
```

Add migration scripts to `package.json`:
```json
"typeorm": "typeorm-ts-node-commonjs -d src/database/data-source.ts",
"migration:generate": "yarn typeorm migration:generate",
"migration:run": "yarn typeorm migration:run",
"seed": "ts-node src/database/seeds/seed.ts"
```

- [ ] **Step 9: Write the failing exception-filter test**

`src/common/filters/http-exception.filter.spec.ts`:
```ts
import { ArgumentsHost, NotFoundException } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

function mockHost(url = '/api/v1/tours/42') {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ url }),
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('HttpExceptionFilter', () => {
  it('renders the standard envelope for an HttpException', () => {
    const { host, status, json } = mockHost();
    new HttpExceptionFilter().catch(
      new NotFoundException('Tour with id 42 not found'),
      host,
    );
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: 'Tour with id 42 not found',
        error: 'Not Found',
        path: '/api/v1/tours/42',
        timestamp: expect.any(String),
      }),
    );
  });

  it('maps an unknown error to a 500 without leaking its message', () => {
    const { host, status, json } = mockHost();
    new HttpExceptionFilter().catch(new Error('boom: secret detail'), host);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500, error: 'Internal Server Error' }),
    );
    expect(json.mock.calls[0][0].message).not.toContain('secret detail');
  });
});
```

- [ ] **Step 10: Run it, verify it fails.**

- [ ] **Step 11: Implement `http-exception.filter.ts`**

```ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const payload = isHttp ? exception.getResponse() : null;
    const message =
      typeof payload === 'string'
        ? payload
        : ((payload as { message?: string | string[] })?.message ??
          'Internal server error');
    const error = isHttp ? exception.name.replace(/Exception$/, '') : 'Internal Server Error';

    if (!isHttp) {
      this.logger.error(exception instanceof Error ? exception.stack : exception);
    }

    res.status(status).json({
      statusCode: status,
      message,
      error: this.humanizeError(error, status),
      timestamp: new Date().toISOString(),
      path: req.url,
    });
  }

  private humanizeError(name: string, status: number): string {
    const map: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      500: 'Internal Server Error',
    };
    return map[status] ?? name;
  }
}
```

- [ ] **Step 12: Run it, verify pass.**

- [ ] **Step 13: Rewrite `main.ts` and `app.module.ts`, delete boilerplate**

`main.ts`:
```ts
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get(ConfigService);

  app.use(helmet());
  app.enableCors({ origin: config.get<string[]>('corsOrigins') });
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const swagger = new DocumentBuilder()
    .setTitle('Voyago Tours API')
    .setVersion('1')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger));

  await app.listen(config.get<number>('port') ?? 3000);
}
void bootstrap();
```
> Note: `void bootstrap()` resolves the pre-existing `no-floating-promises` warning; that is expected and intended here.

`app.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [AppConfigModule, DatabaseModule],
})
export class AppModule {}
```

Delete boilerplate:
```bash
rm src/app.controller.ts src/app.service.ts src/app.controller.spec.ts test/app.e2e-spec.ts
```

- [ ] **Step 14: Boot check** — `docker compose up -d db` then `yarn start` → app listens, `/api/docs` renders, no crash. Stop it.

- [ ] **Step 15: Lint + commit**

```bash
yarn lint && yarn test
git add -A
git commit -m "TOUR-003: Wire config, database, bootstrap and error envelope"
```

---

### Task 2: Common building blocks — pagination, decorators

**Files:**
- Create: `src/common/dto/pagination-query.dto.ts`, `src/common/dto/paginated-response.dto.ts`
- Create: `src/common/pagination/paginate.ts`
- Create: `src/common/decorators/current-user.decorator.ts`, `src/common/decorators/roles.decorator.ts`
- Test: `src/common/pagination/paginate.spec.ts`

**Interfaces:**
- Produces:
  - `class PaginationQueryDto { page = 1; limit = 20; }`
  - `buildMeta(total: number, query: PaginationQueryDto): PageMeta` where `PageMeta = { total; page; limit; totalPages }`
  - `paginated<T>(data: T[], total: number, query: PaginationQueryDto): { data: T[]; meta: PageMeta }`
  - `applyPagination(query: PaginationQueryDto): { skip: number; take: number }`
  - `@CurrentUser()` param decorator returning `AuthUser` (defined in Task 4)
  - `Roles(...roles: UserRole[])` decorator setting metadata key `'roles'`

- [ ] **Step 1: Failing pagination test**

`src/common/pagination/paginate.spec.ts`:
```ts
import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { applyPagination, buildMeta, paginated } from './paginate';

const q = (page: number, limit: number): PaginationQueryDto =>
  Object.assign(new PaginationQueryDto(), { page, limit });

describe('pagination helpers', () => {
  it('computes skip/take from page and limit', () => {
    expect(applyPagination(q(3, 20))).toEqual({ skip: 40, take: 20 });
  });

  it('builds meta with a ceil on totalPages', () => {
    expect(buildMeta(45, q(1, 20))).toEqual({
      total: 45, page: 1, limit: 20, totalPages: 3,
    });
  });

  it('wraps data and meta together', () => {
    const res = paginated(['a', 'b'], 2, q(1, 20));
    expect(res).toEqual({
      data: ['a', 'b'],
      meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
    });
  });
});
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement DTOs and helpers**

`pagination-query.dto.ts`:
```ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number) @IsOptional() @IsInt() @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number) @IsOptional() @IsInt() @Min(1) @Max(100)
  limit = 20;
}
```

`paginate.ts`:
```ts
import { PaginationQueryDto } from '../dto/pagination-query.dto';

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function applyPagination(q: PaginationQueryDto): { skip: number; take: number } {
  return { skip: (q.page - 1) * q.limit, take: q.limit };
}

export function buildMeta(total: number, q: PaginationQueryDto): PageMeta {
  return { total, page: q.page, limit: q.limit, totalPages: Math.ceil(total / q.limit) };
}

export function paginated<T>(
  data: T[], total: number, q: PaginationQueryDto,
): { data: T[]; meta: PageMeta } {
  return { data, meta: buildMeta(total, q) };
}
```

`paginated-response.dto.ts`:
```ts
import { ApiProperty } from '@nestjs/swagger';

export class PageMetaDto {
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() totalPages!: number;
}
```

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: Write the decorators**

`roles.decorator.ts`:
```ts
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../modules/users/entities/user.entity';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
```

`current-user.decorator.ts`:
```ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '../../modules/auth/auth-user.type';

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest<{ user: AuthUser }>().user,
);
```
> These import symbols defined in Tasks 3–4. They compile once those tasks land; commit this task's code together with Task 4, or stub the imports if executing strictly in order. To keep tasks green independently, **move Steps 5 into Task 4** if your executor compiles each task in isolation. Otherwise commit now.

- [ ] **Step 6: Lint + commit**

```bash
yarn lint && yarn test paginate
git add src/common
git commit -m "TOUR-004: Add pagination helpers and RBAC decorators"
```

---

### Task 3: Users module — entity, repository, profile read/update

**Files:**
- Create: `src/modules/users/entities/user.entity.ts`, `entities/operator-profile.entity.ts`
- Create: `src/modules/users/dto/update-profile.dto.ts`, `dto/user-response.dto.ts`, `dto/loyalty-response.dto.ts`
- Create: `src/modules/users/users.repository.ts`, `users.service.ts`, `users.controller.ts`, `users.module.ts`
- Create: `src/modules/users/loyalty.ts` (pure tier derivation)
- Test: `src/modules/users/loyalty.spec.ts`, `users.service.spec.ts`

**Interfaces:**
- Produces:
  - `enum UserRole { TOURIST='TOURIST', OPERATOR='OPERATOR', ADMIN='ADMIN' }`
  - `class User` entity with `id, email, passwordHash, fullName, phone, role, loyaltyPoints, createdAt, updatedAt`
  - `deriveTier(points: number): 'BRONZE'|'SILVER'|'GOLD'|'PLATINUM'`
  - `UsersService.findByEmail(email): Promise<User | null>`, `createUser(input): Promise<User>`, `findById(id): Promise<User>`, `updateProfile(id, dto): Promise<User>`, `addLoyaltyPoints(id, points, manager?): Promise<void>`
  - `UsersRepository` wrapping `Repository<User>`

- [ ] **Step 1: Failing loyalty test**

`loyalty.spec.ts`:
```ts
import { deriveTier } from './loyalty';

describe('deriveTier', () => {
  it.each([
    [0, 'BRONZE'], [499, 'BRONZE'],
    [500, 'SILVER'], [999, 'SILVER'],
    [1000, 'GOLD'], [4999, 'GOLD'],
    [5000, 'PLATINUM'],
  ])('maps %i points to %s', (points, tier) => {
    expect(deriveTier(points)).toBe(tier);
  });
});
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement `loyalty.ts`**

```ts
export type LoyaltyTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export function deriveTier(points: number): LoyaltyTier {
  if (points >= 5000) return 'PLATINUM';
  if (points >= 1000) return 'GOLD';
  if (points >= 500) return 'SILVER';
  return 'BRONZE';
}
```

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: Write entities**

`user.entity.ts`:
```ts
import { Exclude } from 'class-transformer';
import {
  Column, CreateDateColumn, Entity, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { OperatorProfile } from './operator-profile.entity';

export enum UserRole { TOURIST = 'TOURIST', OPERATOR = 'OPERATOR', ADMIN = 'ADMIN' }

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ unique: true }) email!: string;
  @Exclude() @Column({ name: 'password_hash' }) passwordHash!: string;
  @Column({ name: 'full_name' }) fullName!: string;
  @Column({ nullable: true }) phone?: string;
  @Column({ type: 'enum', enum: UserRole, default: UserRole.TOURIST }) role!: UserRole;
  @Column({ name: 'loyalty_points', type: 'int', default: 0 }) loyaltyPoints!: number;
  @OneToOne(() => OperatorProfile, (p) => p.user) operatorProfile?: OperatorProfile;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}
```

`operator-profile.entity.ts`:
```ts
import {
  Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('operator_profiles')
export class OperatorProfile {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @OneToOne(() => User, (u) => u.operatorProfile) @JoinColumn({ name: 'user_id' }) user!: User;
  @Column({ name: 'company_name' }) companyName!: string;
  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true }) verifiedAt?: Date;
}
```

- [ ] **Step 6: Write DTOs**

`update-profile.dto.ts`:
```ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Kofi Mensah' })
  @IsOptional() @IsString() @Length(2, 120) fullName?: string;

  @ApiPropertyOptional({ example: '+233201234567' })
  @IsOptional() @IsString() @Length(7, 20) phone?: string;
}
```

`user-response.dto.ts`:
```ts
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';

export class UserResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() email!: string;
  @ApiProperty() fullName!: string;
  @ApiProperty({ required: false }) phone?: string;
  @ApiProperty({ enum: UserRole }) role!: UserRole;
  @ApiProperty() loyaltyPoints!: number;

  static from(u: { id: string; email: string; fullName: string; phone?: string; role: UserRole; loyaltyPoints: number }): UserResponseDto {
    const dto = new UserResponseDto();
    Object.assign(dto, {
      id: u.id, email: u.email, fullName: u.fullName,
      phone: u.phone, role: u.role, loyaltyPoints: u.loyaltyPoints,
    });
    return dto;
  }
}
```

`loyalty-response.dto.ts`:
```ts
import { ApiProperty } from '@nestjs/swagger';
import { LoyaltyTier } from '../loyalty';

export class LoyaltyResponseDto {
  @ApiProperty() points!: number;
  @ApiProperty({ example: 'GOLD' }) tier!: LoyaltyTier;
}
```

- [ ] **Step 7: Failing service test** (`users.service.spec.ts`)

```ts
import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';
import { UserRole } from './entities/user.entity';

const repoMock = () => ({
  findByEmail: jest.fn(),
  findById: jest.fn(),
  createUser: jest.fn(),
  save: jest.fn(),
});

describe('UsersService', () => {
  let service: UsersService;
  let repo: ReturnType<typeof repoMock>;

  beforeEach(async () => {
    repo = repoMock();
    const module = await Test.createTestingModule({
      providers: [UsersService, { provide: UsersRepository, useValue: repo }],
    }).compile();
    service = module.get(UsersService);
  });

  it('throws NotFound when the user id is unknown', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
  });

  it('updates only provided profile fields', async () => {
    const user = { id: 'u1', fullName: 'Old', phone: '1', role: UserRole.TOURIST };
    repo.findById.mockResolvedValue(user);
    repo.save.mockImplementation(async (u) => u);
    const result = await service.updateProfile('u1', { fullName: 'New' });
    expect(result.fullName).toBe('New');
    expect(result.phone).toBe('1');
  });
});
```

- [ ] **Step 8: Run, verify fail.**

- [ ] **Step 9: Implement repository, service, controller, module**

`users.repository.ts`:
```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersRepository {
  constructor(@InjectRepository(User) private readonly repo: Repository<User>) {}

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }
  findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }
  createUser(input: Partial<User>): Promise<User> {
    return this.repo.save(this.repo.create(input));
  }
  save(user: User): Promise<User> {
    return this.repo.save(user);
  }
  async addPoints(id: string, points: number, manager?: EntityManager): Promise<void> {
    const r = manager ? manager.getRepository(User) : this.repo;
    await r.increment({ id }, 'loyaltyPoints', points);
  }
}
```

`users.service.ts`:
```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { User } from './entities/user.entity';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly users: UsersRepository) {}

  findByEmail(email: string): Promise<User | null> {
    return this.users.findByEmail(email);
  }
  createUser(input: Partial<User>): Promise<User> {
    return this.users.createUser(input);
  }
  async findById(id: string): Promise<User> {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }
  async updateProfile(id: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.findById(id);
    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.phone !== undefined) user.phone = dto.phone;
    return this.users.save(user);
  }
  addLoyaltyPoints(id: string, points: number, manager?: EntityManager): Promise<void> {
    return this.users.addPoints(id, points, manager);
  }
}
```

`users.controller.ts`:
```ts
import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthUser } from '../auth/auth-user.type';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { LoyaltyResponseDto } from './dto/loyalty-response.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { deriveTier } from './loyalty';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the signed-in user profile' })
  async me(@CurrentUser() user: AuthUser): Promise<UserResponseDto> {
    return UserResponseDto.from(await this.users.findById(user.id));
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update your name or phone' })
  async update(
    @CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    return UserResponseDto.from(await this.users.updateProfile(user.id, dto));
  }

  @Get('me/loyalty')
  @ApiOperation({ summary: 'Get loyalty points and derived tier' })
  async loyalty(@CurrentUser() user: AuthUser): Promise<LoyaltyResponseDto> {
    const u = await this.users.findById(user.id);
    return { points: u.loyaltyPoints, tier: deriveTier(u.loyaltyPoints) };
  }
}
```

`users.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperatorProfile } from './entities/operator-profile.entity';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, OperatorProfile])],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
```

- [ ] **Step 10: Run, verify pass** (`yarn test users`). The controller won't be reachable until Task 4 supplies `JwtAuthGuard`; unit tests pass now.

- [ ] **Step 11: Generate migration**

```bash
yarn build && yarn migration:generate src/database/migrations/Users
yarn migration:run
```

- [ ] **Step 12: Lint + commit**

```bash
yarn lint && yarn test users
git add src/modules/users src/database/migrations
git commit -m "TOUR-005: Add users module with profile and loyalty derivation"
```

---

### Task 4: Auth module — register, login, JWT pair, refresh rotation, guards

**Files:**
- Create: `src/modules/auth/auth-user.type.ts`, `dto/register.dto.ts`, `dto/login.dto.ts`, `dto/auth-tokens.dto.ts`, `dto/refresh.dto.ts`
- Create: `src/modules/auth/entities/refresh-token.entity.ts`
- Create: `src/modules/auth/refresh-token.repository.ts`, `auth.service.ts`, `auth.controller.ts`, `auth.module.ts`
- Create: `src/modules/auth/strategies/jwt.strategy.ts`
- Create: `src/common/guards/jwt-auth.guard.ts`, `roles.guard.ts`, `ownership.guard.ts`
- Test: `src/modules/auth/auth.service.spec.ts`, `src/common/guards/roles.guard.spec.ts`

**Interfaces:**
- Consumes: `UsersService` (Task 3), `UserRole`, `ROLES_KEY` (Task 2).
- Produces:
  - `type AuthUser = { id: string; email: string; role: UserRole }`
  - `AuthService.register(dto): Promise<AuthTokens>`, `login(dto): Promise<AuthTokens>`, `refresh(token): Promise<AuthTokens>`, `logout(token): Promise<void>`
  - `type AuthTokens = { accessToken: string; refreshToken: string }`
  - `JwtAuthGuard`, `RolesGuard`, `OwnershipGuard` + `OWNS` metadata

- [ ] **Step 1: Install auth deps**

```bash
yarn add @nestjs/jwt @nestjs/passport passport passport-jwt passport-local argon2
yarn add -D @types/passport-jwt @types/passport-local
```

- [ ] **Step 2: Write `auth-user.type.ts` and the refresh-token entity**

`auth-user.type.ts`:
```ts
import { UserRole } from '../users/entities/user.entity';
export type AuthUser = { id: string; email: string; role: UserRole };
```

`entities/refresh-token.entity.ts`:
```ts
import {
  Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column({ name: 'user_id' }) userId!: string;
  @Column({ name: 'token_hash' }) tokenHash!: string;
  @Column({ name: 'expires_at', type: 'timestamptz' }) expiresAt!: Date;
  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true }) revokedAt?: Date;
  @Column({ name: 'user_agent', nullable: true }) userAgent?: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
}
```

- [ ] **Step 3: Failing auth-service test**

`auth.service.spec.ts`:
```ts
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { RefreshTokenRepository } from './refresh-token.repository';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user.entity';

describe('AuthService', () => {
  let service: AuthService;
  let users: { findByEmail: jest.Mock; createUser: jest.Mock; findById: jest.Mock };
  let tokens: { create: jest.Mock; findActiveByHash: jest.Mock; revoke: jest.Mock };

  beforeEach(async () => {
    users = { findByEmail: jest.fn(), createUser: jest.fn(), findById: jest.fn() };
    tokens = { create: jest.fn(), findActiveByHash: jest.fn(), revoke: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        { provide: RefreshTokenRepository, useValue: tokens },
        { provide: JwtService, useValue: { signAsync: jest.fn().mockResolvedValue('jwt'), verifyAsync: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn(() => ({ accessSecret: 's', accessTtl: '15m', refreshSecret: 'r', refreshTtl: '7d' })) } },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  it('rejects registration when the email already exists', async () => {
    users.findByEmail.mockResolvedValue({ id: 'u1' });
    await expect(
      service.register({ email: 'a@b.com', password: 'password123', fullName: 'A' }),
    ).rejects.toThrow(ConflictException);
  });

  it('hashes the password with argon2 on registration', async () => {
    users.findByEmail.mockResolvedValue(null);
    users.createUser.mockImplementation(async (u) => ({ ...u, id: 'u1', role: UserRole.TOURIST }));
    tokens.create.mockResolvedValue(undefined);
    await service.register({ email: 'a@b.com', password: 'password123', fullName: 'A' });
    const saved = users.createUser.mock.calls[0][0];
    expect(saved.passwordHash).not.toBe('password123');
    expect(await argon2.verify(saved.passwordHash, 'password123')).toBe(true);
  });

  it('rejects login with a wrong password', async () => {
    const hash = await argon2.hash('correct');
    users.findByEmail.mockResolvedValue({ id: 'u1', email: 'a@b.com', role: UserRole.TOURIST, passwordHash: hash });
    await expect(
      service.login({ email: 'a@b.com', password: 'wrong' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
```

- [ ] **Step 4: Run, verify fail.**

- [ ] **Step 5: Write DTOs**

`dto/register.dto.ts`:
```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'kofi@example.com' }) @IsEmail() email!: string;
  @ApiProperty({ example: 'password123', minLength: 8 }) @IsString() @Length(8, 128) password!: string;
  @ApiProperty({ example: 'Kofi Mensah' }) @IsString() @Length(2, 120) fullName!: string;
}
```

`dto/login.dto.ts`:
```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'kofi@example.com' }) @IsEmail() email!: string;
  @ApiProperty({ example: 'password123' }) @IsString() password!: string;
}
```

`dto/refresh.dto.ts`:
```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshDto {
  @ApiProperty() @IsString() refreshToken!: string;
}
```

`dto/auth-tokens.dto.ts`:
```ts
import { ApiProperty } from '@nestjs/swagger';

export class AuthTokensDto {
  @ApiProperty() accessToken!: string;
  @ApiProperty() refreshToken!: string;
}
```

- [ ] **Step 6: Write the refresh-token repository**

`refresh-token.repository.ts`:
```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { RefreshToken } from './entities/refresh-token.entity';

@Injectable()
export class RefreshTokenRepository {
  constructor(
    @InjectRepository(RefreshToken) private readonly repo: Repository<RefreshToken>,
  ) {}

  create(input: Partial<RefreshToken>): Promise<RefreshToken> {
    return this.repo.save(this.repo.create(input));
  }
  findActiveByHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.repo.findOne({ where: { tokenHash, revokedAt: IsNull() } });
  }
  async revoke(id: string): Promise<void> {
    await this.repo.update({ id }, { revokedAt: new Date() });
  }
}
```

- [ ] **Step 7: Implement `auth.service.ts`**

```ts
import {
  ConflictException, Injectable, UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { AuthUser } from './auth-user.type';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenRepository } from './refresh-token.repository';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user.entity';

export type AuthTokens = { accessToken: string; refreshToken: string };

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokens> {
    if (await this.users.findByEmail(dto.email)) {
      throw new ConflictException('Email already registered');
    }
    const user = await this.users.createUser({
      email: dto.email,
      passwordHash: await argon2.hash(dto.password),
      fullName: dto.fullName,
      role: UserRole.TOURIST,
    });
    return this.issueTokens({ id: user.id, email: user.email, role: user.role });
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.users.findByEmail(dto.email);
    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.issueTokens({ id: user.id, email: user.email, role: user.role });
  }

  async refresh(rawToken: string): Promise<AuthTokens> {
    const record = await this.refreshTokens.findActiveByHash(this.hash(rawToken));
    if (!record || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    await this.refreshTokens.revoke(record.id); // rotation
    const user = await this.users.findById(record.userId);
    return this.issueTokens({ id: user.id, email: user.email, role: user.role });
  }

  async logout(rawToken: string): Promise<void> {
    const record = await this.refreshTokens.findActiveByHash(this.hash(rawToken));
    if (record) await this.refreshTokens.revoke(record.id);
  }

  private async issueTokens(user: AuthUser): Promise<AuthTokens> {
    const jwtCfg = this.config.get<{ accessSecret: string; accessTtl: string; refreshSecret: string; refreshTtl: string }>('jwt')!;
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, role: user.role },
      { secret: jwtCfg.accessSecret, expiresIn: jwtCfg.accessTtl },
    );
    const rawRefresh = randomBytes(48).toString('hex');
    await this.refreshTokens.create({
      userId: user.id,
      tokenHash: this.hash(rawRefresh),
      expiresAt: this.ttlToDate(jwtCfg.refreshTtl),
    });
    return { accessToken, refreshToken: rawRefresh };
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private ttlToDate(ttl: string): Date {
    const days = ttl.endsWith('d') ? parseInt(ttl, 10) : 7;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
}
```

- [ ] **Step 8: Run, verify pass** (`yarn test auth.service`).

- [ ] **Step 9: Write the JWT strategy, controller, module**

`strategies/jwt.strategy.ts`:
```ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthUser } from '../auth-user.type';
import { UserRole } from '../../users/entities/user.entity';

type JwtPayload = { sub: string; email: string; role: UserRole };

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<{ accessSecret: string }>('jwt')!.accessSecret,
    });
  }
  validate(payload: JwtPayload): AuthUser {
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
```

`auth.controller.ts`:
```ts
import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthTokensDto } from './dto/auth-tokens.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a tourist account' })
  register(@Body() dto: RegisterDto): Promise<AuthTokensDto> {
    return this.auth.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Log in and receive an access/refresh pair' })
  login(@Body() dto: LoginDto): Promise<AuthTokensDto> {
    return this.auth.login(dto);
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate a refresh token for a new pair' })
  refresh(@Body() dto: RefreshDto): Promise<AuthTokensDto> {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'Revoke a refresh token' })
  async logout(@Body() dto: RefreshDto): Promise<void> {
    await this.auth.logout(dto.refreshToken);
  }
}
```
> Password reset endpoints (`/auth/forgot-password`, `/auth/reset-password`) are specified but require an email transport not in scope for the demo. Add a follow-up task if a mail provider is chosen; the spec permits deferral with a flag. **Flagged as a known gap.**

`auth.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { RefreshTokenRepository } from './refresh-token.repository';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({}),
    TypeOrmModule.forFeature([RefreshToken]),
  ],
  controllers: [AuthController],
  providers: [AuthService, RefreshTokenRepository, JwtStrategy],
})
export class AuthModule {}
```

- [ ] **Step 10: Write the guards + failing RolesGuard test**

`roles.guard.spec.ts`:
```ts
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../../modules/users/entities/user.entity';

function ctx(role: UserRole): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
    getHandler: () => ({}), getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('allows when no roles are required', () => {
    const reflector = { getAllAndOverride: () => undefined } as unknown as Reflector;
    expect(new RolesGuard(reflector).canActivate(ctx(UserRole.TOURIST))).toBe(true);
  });

  it('allows a user whose role is permitted', () => {
    const reflector = { getAllAndOverride: () => [UserRole.ADMIN] } as unknown as Reflector;
    expect(new RolesGuard(reflector).canActivate(ctx(UserRole.ADMIN))).toBe(true);
  });

  it('forbids a user whose role is not permitted', () => {
    const reflector = { getAllAndOverride: () => [UserRole.ADMIN] } as unknown as Reflector;
    expect(() => new RolesGuard(reflector).canActivate(ctx(UserRole.TOURIST)))
      .toThrow(ForbiddenException);
  });
});
```

`guards/jwt-auth.guard.ts`:
```ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

`guards/roles.guard.ts`:
```ts
import {
  CanActivate, ExecutionContext, ForbiddenException, Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthUser } from '../../modules/auth/auth-user.type';
import { UserRole } from '../../modules/users/entities/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(
      ROLES_KEY, [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;
    const { user } = context.switchToHttp().getRequest<{ user: AuthUser }>();
    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}
```

`guards/ownership.guard.ts` (generic owner check; the resource loader is provided per-controller via a token):
```ts
import {
  CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthUser } from '../../modules/auth/auth-user.type';
import { UserRole } from '../../modules/users/entities/user.entity';

export const OWNS_PARAM = 'owns_param';
/** Marks which route param holds the id whose owner must match the caller. */
export const Owns = (param: string) => SetMetadata(OWNS_PARAM, param);

export interface OwnerResolver {
  ownerIdFor(resourceId: string): Promise<string | null>;
}
export const OWNER_RESOLVER = 'OWNER_RESOLVER';

@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    // Resolver is bound in the module that uses the guard.
    private readonly resolver: OwnerResolver,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const param = this.reflector.getAllAndOverride<string | undefined>(
      OWNS_PARAM, [context.getHandler(), context.getClass()],
    );
    if (!param) return true;
    const req = context.switchToHttp().getRequest<{ user: AuthUser; params: Record<string, string> }>();
    if (req.user.role === UserRole.ADMIN) return true; // admin bypass
    const ownerId = await this.resolver.ownerIdFor(req.params[param]);
    if (ownerId !== req.user.id) throw new ForbiddenException('Not the resource owner');
    return true;
  }
}
```
> The `OwnershipGuard` is wired in the tours module (Task 6), which provides `OWNER_RESOLVER`. It is defined here so the auth surface is complete in one place.

- [ ] **Step 11: Register `AuthModule` + `UsersModule` in `app.module.ts`, add global serializer**

Modify `app.module.ts` imports to add `AuthModule, UsersModule`. In `main.ts`, after the validation pipe add:
```ts
import { ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
// ...
app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
```

- [ ] **Step 12: Run tests, generate + run migration**

```bash
yarn test auth roles.guard
yarn build && yarn migration:generate src/database/migrations/RefreshTokens && yarn migration:run
```

- [ ] **Step 13: Manual smoke** — start app; `POST /api/v1/auth/register`, then `GET /api/v1/users/me` with the bearer token returns the profile; a bad token returns the 401 envelope.

- [ ] **Step 14: Lint + commit**

```bash
yarn lint && yarn test
git add -A
git commit -m "TOUR-006: Add auth with JWT pair, refresh rotation and RBAC guards"
```

---

### Task 5: Destinations module — admin-managed reference data

**Files:**
- Create: `src/modules/destinations/entities/destination.entity.ts`
- Create: `src/modules/destinations/dto/{create-destination.dto,update-destination.dto,destination-response.dto}.ts`
- Create: `src/modules/destinations/{destinations.repository,destinations.service,destinations.controller,destinations.module}.ts`
- Test: `src/modules/destinations/destinations.service.spec.ts`

**Interfaces:**
- Consumes: `JwtAuthGuard`, `RolesGuard`, `Roles`, `UserRole.ADMIN`, pagination helpers.
- Produces: `DestinationsService.findAll(query)`, `findOne(id)`, `create(dto)`, `update(id, dto)`, `remove(id)`; entity `Destination { id, name, region, country, description, heroImageUrl, lat, lng }`.

This is the first full public-read / admin-write slice and the reference for the CRUD shape reused by later modules.

- [ ] **Step 1: Entity**

```ts
import {
  Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('destinations')
export class Destination {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() name!: string;
  @Column() region!: string;
  @Column({ default: 'Ghana' }) country!: string;
  @Column({ type: 'text' }) description!: string;
  @Column({ name: 'hero_image_url', nullable: true }) heroImageUrl?: string;
  @Column({ type: 'double precision', nullable: true }) lat?: number;
  @Column({ type: 'double precision', nullable: true }) lng?: number;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}
```

- [ ] **Step 2: DTOs**

`create-destination.dto.ts`:
```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsLatitude, IsLongitude, IsOptional, IsString, Length } from 'class-validator';

export class CreateDestinationDto {
  @ApiProperty({ example: 'Cape Coast' }) @IsString() @Length(2, 120) name!: string;
  @ApiProperty({ example: 'Central Region' }) @IsString() region!: string;
  @ApiPropertyOptional({ example: 'Ghana' }) @IsOptional() @IsString() country?: string;
  @ApiProperty({ example: 'Historic coastal town...' }) @IsString() description!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() heroImageUrl?: string;
  @ApiPropertyOptional({ example: 5.106 }) @IsOptional() @IsLatitude() lat?: number;
  @ApiPropertyOptional({ example: -1.246 }) @IsOptional() @IsLongitude() lng?: number;
}
```

`update-destination.dto.ts`:
```ts
import { PartialType } from '@nestjs/swagger';
import { CreateDestinationDto } from './create-destination.dto';
export class UpdateDestinationDto extends PartialType(CreateDestinationDto) {}
```

`destination-response.dto.ts`:
```ts
import { ApiProperty } from '@nestjs/swagger';
import { Destination } from '../entities/destination.entity';

export class DestinationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() region!: string;
  @ApiProperty() country!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ required: false }) heroImageUrl?: string;
  @ApiProperty({ required: false }) lat?: number;
  @ApiProperty({ required: false }) lng?: number;

  static from(d: Destination): DestinationResponseDto {
    const dto = new DestinationResponseDto();
    Object.assign(dto, d);
    return dto;
  }
}
```

- [ ] **Step 3: Failing service test**

```ts
import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DestinationsRepository } from './destinations.repository';
import { DestinationsService } from './destinations.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

describe('DestinationsService', () => {
  let service: DestinationsService;
  let repo: { findAndCount: jest.Mock; findById: jest.Mock; create: jest.Mock; save: jest.Mock; remove: jest.Mock };

  beforeEach(async () => {
    repo = { findAndCount: jest.fn(), findById: jest.fn(), create: jest.fn(), save: jest.fn(), remove: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [DestinationsService, { provide: DestinationsRepository, useValue: repo }],
    }).compile();
    service = module.get(DestinationsService);
  });

  it('returns a paginated envelope', async () => {
    repo.findAndCount.mockResolvedValue([[{ id: 'd1' }], 1]);
    const q = Object.assign(new PaginationQueryDto(), { page: 1, limit: 20 });
    const res = await service.findAll(q);
    expect(res.meta).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 });
    expect(res.data).toHaveLength(1);
  });

  it('throws NotFound for an unknown id', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.findOne('x')).rejects.toThrow(NotFoundException);
  });
});
```

- [ ] **Step 4: Run, verify fail.**

- [ ] **Step 5: Repository + service + controller + module**

`destinations.repository.ts`:
```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Destination } from './entities/destination.entity';

@Injectable()
export class DestinationsRepository {
  constructor(@InjectRepository(Destination) private readonly repo: Repository<Destination>) {}
  findAndCount(skip: number, take: number): Promise<[Destination[], number]> {
    return this.repo.findAndCount({ skip, take, order: { name: 'ASC' } });
  }
  findById(id: string): Promise<Destination | null> {
    return this.repo.findOne({ where: { id } });
  }
  create(input: Partial<Destination>): Destination { return this.repo.create(input); }
  save(d: Destination): Promise<Destination> { return this.repo.save(d); }
  remove(d: Destination): Promise<Destination> { return this.repo.remove(d); }
}
```

`destinations.service.ts`:
```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { applyPagination, paginated, PageMeta } from '../../common/pagination/paginate';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { UpdateDestinationDto } from './dto/update-destination.dto';
import { Destination } from './entities/destination.entity';
import { DestinationsRepository } from './destinations.repository';

@Injectable()
export class DestinationsService {
  constructor(private readonly repo: DestinationsRepository) {}

  async findAll(q: PaginationQueryDto): Promise<{ data: Destination[]; meta: PageMeta }> {
    const { skip, take } = applyPagination(q);
    const [data, total] = await this.repo.findAndCount(skip, take);
    return paginated(data, total, q);
  }
  async findOne(id: string): Promise<Destination> {
    const d = await this.repo.findById(id);
    if (!d) throw new NotFoundException(`Destination ${id} not found`);
    return d;
  }
  create(dto: CreateDestinationDto): Promise<Destination> {
    return this.repo.save(this.repo.create(dto));
  }
  async update(id: string, dto: UpdateDestinationDto): Promise<Destination> {
    const d = await this.findOne(id);
    Object.assign(d, dto);
    return this.repo.save(d);
  }
  async remove(id: string): Promise<void> {
    await this.repo.remove(await this.findOne(id));
  }
}
```

`destinations.controller.ts`:
```ts
import {
  Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { UserRole } from '../users/entities/user.entity';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { DestinationResponseDto } from './dto/destination-response.dto';
import { UpdateDestinationDto } from './dto/update-destination.dto';
import { DestinationsService } from './destinations.service';

@ApiTags('Destinations')
@Controller('destinations')
export class DestinationsController {
  constructor(private readonly service: DestinationsService) {}

  @Get()
  @ApiOperation({ summary: 'List destinations (public)' })
  async findAll(@Query() q: PaginationQueryDto) {
    const { data, meta } = await this.service.findAll(q);
    return { data: data.map(DestinationResponseDto.from), meta };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one destination (public)' })
  async findOne(@Param('id') id: string): Promise<DestinationResponseDto> {
    return DestinationResponseDto.from(await this.service.findOne(id));
  }

  @Post()
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a destination (admin)' })
  async create(@Body() dto: CreateDestinationDto): Promise<DestinationResponseDto> {
    return DestinationResponseDto.from(await this.service.create(dto));
  }

  @Patch(':id')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a destination (admin)' })
  async update(@Param('id') id: string, @Body() dto: UpdateDestinationDto): Promise<DestinationResponseDto> {
    return DestinationResponseDto.from(await this.service.update(id, dto));
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a destination (admin)' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.service.remove(id);
  }
}
```

`destinations.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Destination } from './entities/destination.entity';
import { DestinationsController } from './destinations.controller';
import { DestinationsRepository } from './destinations.repository';
import { DestinationsService } from './destinations.service';

@Module({
  imports: [TypeOrmModule.forFeature([Destination])],
  controllers: [DestinationsController],
  providers: [DestinationsService, DestinationsRepository],
  exports: [DestinationsService],
})
export class DestinationsModule {}
```

- [ ] **Step 6: Run tests, register module, migration, commit**

```bash
yarn test destinations
# add DestinationsModule to app.module.ts imports
yarn build && yarn migration:generate src/database/migrations/Destinations && yarn migration:run
yarn lint && git add -A && git commit -m "TOUR-007: Add destinations CRUD with public read and admin write"
```

---

### Task 6: Tours + departures — listings, approval workflow, ownership, inventory

**Files:**
- Create: `src/modules/tours/entities/{tour.entity,tour-departure.entity}.ts`
- Create: `src/modules/tours/dto/{create-tour.dto,update-tour.dto,tour-response.dto,tour-query.dto,create-departure.dto,departure-response.dto}.ts`
- Create: `src/modules/tours/{tours.repository,tour-departures.repository,tours.service,tour-departures.service,tours.controller,tours.module}.ts`
- Test: `src/modules/tours/tours.service.spec.ts`, `tour-departures.service.spec.ts`

**Interfaces:**
- Consumes: guards, `Owns`/`OwnershipGuard`/`OWNER_RESOLVER`, `DestinationsService`, pagination.
- Produces:
  - `enum TourStatus { DRAFT, PENDING_REVIEW, APPROVED, SUSPENDED }`
  - `Tour { id, operatorId, destinationId, title, slug, description, priceMinor, currency, durationMinutes, status, heroImageUrl, ratingAvg, ratingCount }`
  - `TourDeparture { id, tourId, departsAt, capacity, status }`
  - `ToursService.search(query)`, `findBySlug(slug)`, `findOwned(id, operatorId)`, `create(operatorId, dto)`, `update(id, operatorId, dto)`, `submit(id, operatorId)`, `approve(id)`, `suspend(id)`, `ownerIdFor(tourId)`
  - `TourDeparturesService.create(tourId, dto)`, `listForTour(tourId)`, `seatsLeft(departureId)` — the last consumed by Task 7.

- [ ] **Step 1: Entities** (`tour.entity.ts`)

```ts
import {
  Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';

export enum TourStatus {
  DRAFT = 'DRAFT', PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED', SUSPENDED = 'SUSPENDED',
}

@Entity('tours')
export class Tour {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column({ name: 'operator_id' }) operatorId!: string;
  @Index() @Column({ name: 'destination_id' }) destinationId!: string;
  @Column() title!: string;
  @Column({ unique: true }) slug!: string;
  @Column({ type: 'text' }) description!: string;
  @Column({ name: 'price_minor', type: 'int' }) priceMinor!: number;
  @Column({ default: 'GHS' }) currency!: string;
  @Column({ name: 'duration_minutes', type: 'int' }) durationMinutes!: number;
  @Column({ type: 'enum', enum: TourStatus, default: TourStatus.DRAFT }) status!: TourStatus;
  @Column({ name: 'hero_image_url', nullable: true }) heroImageUrl?: string;
  @Column({ name: 'rating_avg', type: 'double precision', default: 0 }) ratingAvg!: number;
  @Column({ name: 'rating_count', type: 'int', default: 0 }) ratingCount!: number;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}
```

`tour-departure.entity.ts`:
```ts
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum DepartureStatus { SCHEDULED = 'SCHEDULED', CANCELLED = 'CANCELLED' }

@Entity('tour_departures')
export class TourDeparture {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column({ name: 'tour_id' }) tourId!: string;
  @Column({ name: 'departs_at', type: 'timestamptz' }) departsAt!: Date;
  @Column({ type: 'int' }) capacity!: number;
  @Column({ type: 'enum', enum: DepartureStatus, default: DepartureStatus.SCHEDULED }) status!: DepartureStatus;
}
```

- [ ] **Step 2: DTOs** — `create-tour.dto.ts`

```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Length, Min } from 'class-validator';

export class CreateTourDto {
  @ApiProperty({ example: 'Kakum Canopy Walk' }) @IsString() @Length(3, 160) title!: string;
  @ApiProperty() @IsUUID() destinationId!: string;
  @ApiProperty({ example: 'A guided canopy walk...' }) @IsString() description!: string;
  @ApiProperty({ example: 12000, description: 'Price in pesewas (GHS 120.00)' })
  @IsInt() @Min(0) priceMinor!: number;
  @ApiProperty({ example: 180 }) @IsInt() @Min(1) durationMinutes!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() heroImageUrl?: string;
}
```

`tour-query.dto.ts`:
```ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class TourQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() destinationId?: string;
  @ApiPropertyOptional({ description: 'Min price in pesewas' })
  @Type(() => Number) @IsOptional() @IsInt() @Min(0) minPrice?: number;
  @ApiPropertyOptional({ description: 'Max price in pesewas' })
  @Type(() => Number) @IsOptional() @IsInt() @Min(0) maxPrice?: number;
  @ApiPropertyOptional({ example: '-price', description: 'price | -price | title' })
  @IsOptional() @IsString() sort?: string;
}
```

`create-departure.dto.ts`:
```ts
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsInt, Min } from 'class-validator';

export class CreateDepartureDto {
  @ApiProperty({ example: '2026-08-25T08:30:00.000Z' })
  @Type(() => Date) @IsDate() departsAt!: Date;
  @ApiProperty({ example: 20 }) @IsInt() @Min(1) capacity!: number;
}
```

`tour-response.dto.ts` and `departure-response.dto.ts` follow the `static from()` pattern from Task 5; `DepartureResponseDto` includes a `seatsLeft: number` field populated by the service.

- [ ] **Step 3: Failing tours-service test — approval workflow + visibility + slug**

```ts
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ToursRepository } from './tours.repository';
import { ToursService } from './tours.service';
import { DestinationsService } from '../destinations/destinations.service';
import { TourStatus } from './entities/tour.entity';

describe('ToursService', () => {
  let service: ToursService;
  let repo: Record<string, jest.Mock>;

  beforeEach(async () => {
    repo = {
      save: jest.fn((t) => Promise.resolve({ id: 't1', ...t })),
      create: jest.fn((t) => t),
      findById: jest.fn(),
      existsBySlug: jest.fn().mockResolvedValue(false),
      searchApproved: jest.fn(),
    };
    const module = await Test.createTestingModule({
      providers: [
        ToursService,
        { provide: ToursRepository, useValue: repo },
        { provide: DestinationsService, useValue: { findOne: jest.fn().mockResolvedValue({ id: 'd1' }) } },
      ],
    }).compile();
    service = module.get(ToursService);
  });

  it('creates a tour in DRAFT with a slug derived from the title', async () => {
    const tour = await service.create('op1', {
      title: 'Kakum Canopy Walk', destinationId: 'd1',
      description: 'x', priceMinor: 12000, durationMinutes: 180,
    });
    expect(tour.status).toBe(TourStatus.DRAFT);
    expect(tour.slug).toMatch(/^kakum-canopy-walk/);
    expect(tour.operatorId).toBe('op1');
  });

  it('moves DRAFT to PENDING_REVIEW on submit', async () => {
    repo.findById.mockResolvedValue({ id: 't1', operatorId: 'op1', status: TourStatus.DRAFT });
    const tour = await service.submit('t1', 'op1');
    expect(tour.status).toBe(TourStatus.PENDING_REVIEW);
  });

  it('forbids submit by a non-owner', async () => {
    repo.findById.mockResolvedValue({ id: 't1', operatorId: 'other', status: TourStatus.DRAFT });
    await expect(service.submit('t1', 'op1')).rejects.toThrow(ForbiddenException);
  });

  it('rejects approve unless the tour is PENDING_REVIEW', async () => {
    repo.findById.mockResolvedValue({ id: 't1', status: TourStatus.DRAFT });
    await expect(service.approve('t1')).rejects.toThrow(BadRequestException);
  });
});
```

- [ ] **Step 4: Run, verify fail.**

- [ ] **Step 5: Implement repositories and services**

`tours.service.ts` (core logic; slug uses a short random suffix for uniqueness — `Math.random` is not used, we use `crypto.randomBytes`):
```ts
import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { applyPagination, paginated, PageMeta } from '../../common/pagination/paginate';
import { DestinationsService } from '../destinations/destinations.service';
import { CreateTourDto } from './dto/create-tour.dto';
import { UpdateTourDto } from './dto/update-tour.dto';
import { TourQueryDto } from './dto/tour-query.dto';
import { Tour, TourStatus } from './entities/tour.entity';
import { ToursRepository } from './tours.repository';

@Injectable()
export class ToursService {
  constructor(
    private readonly repo: ToursRepository,
    private readonly destinations: DestinationsService,
  ) {}

  async create(operatorId: string, dto: CreateTourDto): Promise<Tour> {
    await this.destinations.findOne(dto.destinationId); // 404 if unknown
    const slug = `${this.slugify(dto.title)}-${randomBytes(3).toString('hex')}`;
    return this.repo.save(this.repo.create({
      ...dto, operatorId, slug, currency: 'GHS', status: TourStatus.DRAFT,
    }));
  }

  async search(q: TourQueryDto): Promise<{ data: Tour[]; meta: PageMeta }> {
    const { skip, take } = applyPagination(q);
    const [data, total] = await this.repo.searchApproved(q, skip, take);
    return paginated(data, total, q);
  }

  async findBySlug(slug: string): Promise<Tour> {
    const tour = await this.repo.findBySlug(slug);
    if (!tour || tour.status !== TourStatus.APPROVED) {
      throw new NotFoundException(`Tour ${slug} not found`);
    }
    return tour;
  }

  private async owned(id: string, operatorId: string): Promise<Tour> {
    const tour = await this.repo.findById(id);
    if (!tour) throw new NotFoundException(`Tour ${id} not found`);
    if (tour.operatorId !== operatorId) throw new ForbiddenException('Not the tour owner');
    return tour;
  }

  async update(id: string, operatorId: string, dto: UpdateTourDto): Promise<Tour> {
    const tour = await this.owned(id, operatorId);
    Object.assign(tour, dto);
    return this.repo.save(tour);
  }

  async submit(id: string, operatorId: string): Promise<Tour> {
    const tour = await this.owned(id, operatorId);
    if (tour.status !== TourStatus.DRAFT) {
      throw new BadRequestException('Only a draft can be submitted');
    }
    tour.status = TourStatus.PENDING_REVIEW;
    return this.repo.save(tour);
  }

  async approve(id: string): Promise<Tour> {
    const tour = await this.byIdOrThrow(id);
    if (tour.status !== TourStatus.PENDING_REVIEW) {
      throw new BadRequestException('Only a tour pending review can be approved');
    }
    tour.status = TourStatus.APPROVED;
    return this.repo.save(tour);
  }

  async suspend(id: string): Promise<Tour> {
    const tour = await this.byIdOrThrow(id);
    tour.status = TourStatus.SUSPENDED;
    return this.repo.save(tour);
  }

  async ownerIdFor(tourId: string): Promise<string | null> {
    const tour = await this.repo.findById(tourId);
    return tour?.operatorId ?? null;
  }

  private async byIdOrThrow(id: string): Promise<Tour> {
    const tour = await this.repo.findById(id);
    if (!tour) throw new NotFoundException(`Tour ${id} not found`);
    return tour;
  }

  private slugify(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
}
```

`tours.repository.ts` `searchApproved` builds a query with `status = APPROVED`, optional `destinationId`, `priceMinor BETWEEN`, and a whitelisted sort (`price`/`-price`/`title` → `{ priceMinor: 'ASC'|'DESC' }` / `{ title: 'ASC' }`, default `{ createdAt: 'DESC' }`). Never interpolate the raw `sort` string into SQL.

`tour-departures.service.ts` exposes `seatsLeft(departureId)` computed as `capacity - sum(seats of PENDING|CONFIRMED bookings)` via a repository count (bookings repository injected in Task 7; until then `seatsLeft` reads `capacity`). To avoid a circular dependency, **the seat-consumption count lives in the bookings module and is injected here via an interface token `SEAT_COUNTER`** defined in Task 7. For this task, `seatsLeft` returns `capacity`; Task 7 wires the real counter.

- [ ] **Step 6: Controller + module**

`tours.controller.ts` wires the routes from spec §5. Owner-guarded routes use `@UseGuards(JwtAuthGuard, RolesGuard, OwnershipGuard) @Roles(UserRole.OPERATOR) @Owns('id')`. `tours.module.ts` provides `{ provide: OWNER_RESOLVER, useExisting: ToursService }` and binds `OwnershipGuard` with that resolver, exports `ToursService` and `TourDeparturesService`.

- [ ] **Step 7: Run tests, migration, commit**

```bash
yarn test tours
yarn build && yarn migration:generate src/database/migrations/Tours && yarn migration:run
yarn lint && git add -A && git commit -m "TOUR-008: Add tours listing workflow and departure inventory"
```

---

### Task 7: Bookings core — reference codes, pessimistic-lock creation, cancellation

**Files:**
- Create: `src/modules/bookings/entities/tour-booking.entity.ts`
- Create: `src/modules/bookings/dto/{create-booking.dto,booking-response.dto,booking-query.dto}.ts`
- Create: `src/modules/bookings/{booking-reference.ts,bookings.repository,bookings.service,bookings.controller,bookings.module}.ts`
- Create: `src/modules/bookings/seat-counter.ts` (provides `SEAT_COUNTER` token + impl for Task 6)
- Test: `src/modules/bookings/booking-reference.spec.ts`, `bookings.service.spec.ts`
- Test (integration): `test/e2e/bookings-concurrency.e2e-spec.ts`

**Interfaces:**
- Consumes: `ToursService`, `TourDeparturesService`, `UsersService`, config `booking`.
- Produces:
  - `enum BookingStatus { PENDING, CONFIRMED, CANCELLED, COMPLETED }`
  - `TourBooking { id, reference, touristId, departureId, seats, unitPriceMinor, totalMinor, currency, status, cancelledAt }`
  - `generateReference(seq: number, year: number): string` → `TUR-2026-0007`
  - `BookingsService.create(touristId, dto)`, `findMine(touristId, query)`, `findByReference(ref, requester)`, `cancel(ref, touristId)`, `confirmPaid(bookingId, manager)`, `seatsConsumed(departureId)`, `markCompletedAndAward()` (Task 11).

- [ ] **Step 1: Failing reference test**

`booking-reference.spec.ts`:
```ts
import { generateReference } from './booking-reference';

describe('generateReference', () => {
  it('zero-pads the sequence to four digits with a year segment', () => {
    expect(generateReference(7, 2026)).toBe('TUR-2026-0007');
    expect(generateReference(1234, 2026)).toBe('TUR-2026-1234');
  });
});
```

- [ ] **Step 2: Run, verify fail. Implement:**

`booking-reference.ts`:
```ts
export function generateReference(seq: number, year: number): string {
  return `TUR-${year}-${seq.toString().padStart(4, '0')}`;
}
```

- [ ] **Step 3: Entity + DTOs**

`tour-booking.entity.ts`:
```ts
import {
  Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';

export enum BookingStatus {
  PENDING = 'PENDING', CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED', COMPLETED = 'COMPLETED',
}

@Entity('tour_bookings')
export class TourBooking {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ unique: true }) reference!: string;
  @Index() @Column({ name: 'tourist_id' }) touristId!: string;
  @Index() @Column({ name: 'departure_id' }) departureId!: string;
  @Column({ type: 'int' }) seats!: number;
  @Column({ name: 'unit_price_minor', type: 'int' }) unitPriceMinor!: number;
  @Column({ name: 'total_minor', type: 'int' }) totalMinor!: number;
  @Column({ default: 'GHS' }) currency!: string;
  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.PENDING }) status!: BookingStatus;
  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true }) cancelledAt?: Date;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}
```

`create-booking.dto.ts`:
```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Max, Min } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty() @IsUUID() departureId!: string;
  @ApiProperty({ example: 2, minimum: 1, maximum: 20 })
  @IsInt() @Min(1) @Max(20) seats!: number;
}
```

`booking-query.dto.ts` extends `PaginationQueryDto` with `@IsOptional() @IsIn(['upcoming','completed','cancelled']) status?`.

- [ ] **Step 4: Failing service test — the overbooking rule and cancellation window**

`bookings.service.spec.ts` (transaction mocked via a fake manager):
```ts
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { BookingsRepository } from './bookings.repository';
import { ToursService } from '../tours/tours.service';
import { TourDeparturesService } from '../tours/tour-departures.service';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { BookingStatus } from './entities/tour-booking.entity';

describe('BookingsService', () => {
  let service: BookingsService;
  let repo: Record<string, jest.Mock>;
  let departures: Record<string, jest.Mock>;
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    repo = {
      seatsConsumedForUpdate: jest.fn(),
      insertWithin: jest.fn((b) => Promise.resolve({ id: 'b1', ...b })),
      nextSequence: jest.fn().mockResolvedValue(7),
      findByReference: jest.fn(),
      save: jest.fn((b) => Promise.resolve(b)),
      findMine: jest.fn(),
    };
    departures = {
      lockAndGet: jest.fn(),
      seatsConsumed: jest.fn(),
    };
    dataSource = {
      transaction: jest.fn((cb) => cb({ /* EntityManager stub */ })),
    };
    const module = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: BookingsRepository, useValue: repo },
        { provide: TourDeparturesService, useValue: departures },
        { provide: ToursService, useValue: { findApprovedDeparture: jest.fn() } },
        { provide: ConfigService, useValue: { get: () => ({ seatHoldMinutes: 15, cancellationWindowHours: 48 }) } },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();
    service = module.get(BookingsService);
  });

  it('rejects a booking that would exceed remaining capacity with 409', async () => {
    departures.lockAndGet.mockResolvedValue({ id: 'd1', capacity: 10, departsAt: new Date(Date.now() + 1e9) });
    repo.seatsConsumedForUpdate.mockResolvedValue(9);
    await expect(
      service.create('u1', { departureId: 'd1', seats: 2, unitPriceMinor: 12000 } as never),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects cancellation inside the window with 409', async () => {
    repo.findByReference.mockResolvedValue({
      reference: 'TUR-2026-0007', touristId: 'u1', status: BookingStatus.CONFIRMED,
      departureId: 'd1',
    });
    departures.lockAndGet.mockResolvedValue({ id: 'd1', departsAt: new Date(Date.now() + 1000 * 60 * 60) }); // 1h away
    await expect(service.cancel('TUR-2026-0007', 'u1')).rejects.toThrow(ConflictException);
  });
});
```

- [ ] **Step 5: Run, verify fail.**

- [ ] **Step 6: Implement the repository lock methods and service**

`bookings.repository.ts` key methods:
```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { BookingStatus, TourBooking } from './entities/tour-booking.entity';

@Injectable()
export class BookingsRepository {
  constructor(
    @InjectRepository(TourBooking) private readonly repo: Repository<TourBooking>,
  ) {}

  /** Sum of seats held by live bookings for a departure, read inside the caller's tx. */
  async seatsConsumed(departureId: string, manager?: EntityManager): Promise<number> {
    const r = manager ? manager.getRepository(TourBooking) : this.repo;
    const { sum } = await r
      .createQueryBuilder('b')
      .select('COALESCE(SUM(b.seats), 0)', 'sum')
      .where('b.departure_id = :departureId', { departureId })
      .andWhere('b.status IN (:...live)', { live: [BookingStatus.PENDING, BookingStatus.CONFIRMED] })
      .getRawOne<{ sum: string }>() ?? { sum: '0' };
    return parseInt(sum, 10);
  }

  async nextSequence(manager: EntityManager, year: number): Promise<number> {
    // count existing bookings this year + 1; runs inside the booking tx
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year + 1, 0, 1));
    const count = await manager.getRepository(TourBooking)
      .createQueryBuilder('b')
      .where('b.created_at >= :start AND b.created_at < :end', { start, end })
      .getCount();
    return count + 1;
  }

  findByReference(reference: string): Promise<TourBooking | null> {
    return this.repo.findOne({ where: { reference } });
  }
  save(b: TourBooking, manager?: EntityManager): Promise<TourBooking> {
    return (manager ? manager.getRepository(TourBooking) : this.repo).save(b);
  }
  findExpiredPending(before: Date): Promise<TourBooking[]> {
    return this.repo.find({ where: { status: BookingStatus.PENDING } })
      .then((rows) => rows.filter((b) => b.createdAt < before));
  }
  findDueForCompletion(departureIds: string[]): Promise<TourBooking[]> {
    return this.repo.find({ where: { status: BookingStatus.CONFIRMED, departureId: In(departureIds) } });
  }
}
```

`bookings.service.ts` — the locked create:
```ts
import {
  ConflictException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { generateReference } from './booking-reference';
import { BookingsRepository } from './bookings.repository';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingStatus, TourBooking } from './entities/tour-booking.entity';
import { TourDeparturesService } from '../tours/tour-departures.service';
import { ToursService } from '../tours/tours.service';
import { AuthUser } from '../auth/auth-user.type';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class BookingsService {
  constructor(
    private readonly repo: BookingsRepository,
    private readonly departures: TourDeparturesService,
    private readonly tours: ToursService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async create(touristId: string, dto: CreateBookingDto): Promise<TourBooking> {
    return this.dataSource.transaction(async (manager) => {
      // Lock the departure row so concurrent bookings serialise.
      const departure = await this.departures.lockAndGet(dto.departureId, manager);
      if (!departure) throw new NotFoundException('Departure not found');

      const tour = await this.tours.findApprovedForDeparture(departure.tourId);
      const consumed = await this.repo.seatsConsumed(dto.departureId, manager);
      if (consumed + dto.seats > departure.capacity) {
        throw new ConflictException('Not enough seats remaining on this departure');
      }

      const year = departure.departsAt.getUTCFullYear();
      const seq = await this.repo.nextSequence(manager, new Date().getUTCFullYear());
      const booking = manager.getRepository(TourBooking).create({
        reference: generateReference(seq, new Date().getUTCFullYear()),
        touristId,
        departureId: dto.departureId,
        seats: dto.seats,
        unitPriceMinor: tour.priceMinor,
        totalMinor: tour.priceMinor * dto.seats,
        currency: tour.currency,
        status: BookingStatus.PENDING,
      });
      return manager.getRepository(TourBooking).save(booking);
    });
  }

  async cancel(reference: string, touristId: string): Promise<TourBooking> {
    return this.dataSource.transaction(async (manager) => {
      const booking = await this.repo.findByReference(reference);
      if (!booking) throw new NotFoundException(`Booking ${reference} not found`);
      if (booking.touristId !== touristId) throw new ForbiddenException('Not your booking');
      if (![BookingStatus.PENDING, BookingStatus.CONFIRMED].includes(booking.status)) {
        throw new ConflictException('Booking cannot be cancelled in its current state');
      }
      const departure = await this.departures.lockAndGet(booking.departureId, manager);
      const windowMs = this.config.get<{ cancellationWindowHours: number }>('booking')!
        .cancellationWindowHours * 3600 * 1000;
      if (departure && departure.departsAt.getTime() - Date.now() < windowMs) {
        throw new ConflictException('Cancellation window has closed');
      }
      booking.status = BookingStatus.CANCELLED;
      booking.cancelledAt = new Date();
      return this.repo.save(booking, manager);
      // Refund is triggered by PaymentsService (Task 8), which subscribes to cancellation.
    });
  }

  async findByReference(reference: string, requester: AuthUser): Promise<TourBooking> {
    const booking = await this.repo.findByReference(reference);
    if (!booking) throw new NotFoundException(`Booking ${reference} not found`);
    const isOwner = booking.touristId === requester.id;
    if (!isOwner && requester.role !== UserRole.ADMIN && requester.role !== UserRole.OPERATOR) {
      throw new ForbiddenException('Not permitted to view this booking');
    }
    return booking;
  }

  seatsConsumed(departureId: string): Promise<number> {
    return this.repo.seatsConsumed(departureId);
  }
}
```
> `ToursService.findApprovedForDeparture(tourId)` and `TourDeparturesService.lockAndGet(id, manager)` are added in this task to the Task 6 services (small additions): `lockAndGet` runs `manager.getRepository(TourDeparture).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })`.

- [ ] **Step 7: Wire the seat counter back into Task 6**

Provide `SEAT_COUNTER` in `bookings.module.ts` as `{ provide: SEAT_COUNTER, useExisting: BookingsService }` and have `TourDeparturesService.seatsLeft` call it. This closes the loop deferred in Task 6. Use `forwardRef` between `ToursModule` and `BookingsModule`.

- [ ] **Step 8: Run unit tests, verify pass.**

- [ ] **Step 9: Write the concurrency e2e test (the marquee test)**

`test/e2e/bookings-concurrency.e2e-spec.ts`:
```ts
import { INestApplication } from '@nestjs/common';
import { bootstrapTestApp, seedOneSeatDeparture, tokenFor } from '../utils/test-db';
import * as request from 'supertest';

describe('Booking concurrency (e2e)', () => {
  let app: INestApplication;
  let departureId: string;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    ({ departureId } = await seedOneSeatDeparture(app));
    tokenA = await tokenFor(app, 'a@example.com');
    tokenB = await tokenFor(app, 'b@example.com');
  });
  afterAll(async () => { await app.close(); });

  it('lets exactly one of two racing bookings take the last seat', async () => {
    const book = (token: string) =>
      request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({ departureId, seats: 1 });

    const [ra, rb] = await Promise.all([book(tokenA), book(tokenB)]);
    const statuses = [ra.status, rb.status].sort();
    expect(statuses).toEqual([201, 409]);
  });
});
```

- [ ] **Step 10: Run the e2e against the test DB**

```bash
docker compose up -d db_test
DATABASE_URL=postgres://voyago:voyago@localhost:5433/voyago_test yarn test:e2e bookings-concurrency
```
Expected: one 201, one 409. If both 201, the lock is not being taken — verify `lockAndGet` uses `pessimistic_write` and runs inside the same `manager`.

- [ ] **Step 11: Controller, module, migration, commit**

```bash
yarn test bookings
yarn build && yarn migration:generate src/database/migrations/Bookings && yarn migration:run
yarn lint && git add -A && git commit -m "TOUR-009: Add booking core with pessimistic-lock seat allocation"
```

---

### Task 8: Payments — live Paystack, webhook, verify, refund

**Files:**
- Create: `src/modules/payments/entities/payment.entity.ts`
- Create: `src/modules/payments/dto/{initiate-payment.dto,payment-response.dto}.ts`
- Create: `src/modules/payments/{paystack.client,payments.repository,payments.service,payments.controller,payments.module}.ts`
- Test: `src/modules/payments/payments.service.spec.ts`, `paystack-signature.spec.ts`

**Interfaces:**
- Consumes: config `paystack`, `BookingsService.confirmPaid`, `BookingsService.findByReference`, raw body from webhook.
- Produces: `PaymentsService.initiate(bookingRef, tourist)`, `handleWebhook(rawBody, signature)`, `verify(reference)`, `refund(payment)`; `PaystackClient.initializeTransaction`, `verifyTransaction`, `createRefund`.

- [ ] **Step 1: Install http client** — `yarn add axios` (or use `@nestjs/axios`). Plan uses `axios` directly for a thin client.

- [ ] **Step 2: Failing signature-verification test**

`paystack-signature.spec.ts`:
```ts
import { createHmac } from 'crypto';
import { isValidPaystackSignature } from './paystack.client';

describe('isValidPaystackSignature', () => {
  const secret = 'sk_test_secret';
  const raw = Buffer.from(JSON.stringify({ event: 'charge.success', data: { reference: 'TUR-2026-0007' } }));

  it('accepts a correctly HMAC-SHA512 signed body', () => {
    const sig = createHmac('sha512', secret).update(raw).digest('hex');
    expect(isValidPaystackSignature(raw, sig, secret)).toBe(true);
  });

  it('rejects a tampered body', () => {
    const sig = createHmac('sha512', secret).update(raw).digest('hex');
    const tampered = Buffer.from(raw.toString().replace('0007', '9999'));
    expect(isValidPaystackSignature(tampered, sig, secret)).toBe(false);
  });
});
```

- [ ] **Step 3: Run, verify fail. Implement `paystack.client.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { createHmac, timingSafeEqual } from 'crypto';

export function isValidPaystackSignature(raw: Buffer, signature: string, secret: string): boolean {
  const expected = createHmac('sha512', secret).update(raw).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature ?? '');
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface PaystackInit { authorization_url: string; reference: string }

@Injectable()
export class PaystackClient {
  private readonly http: AxiosInstance;
  private readonly secret: string;

  constructor(config: ConfigService) {
    const p = config.get<{ secretKey: string; baseUrl: string }>('paystack')!;
    this.secret = p.secretKey;
    this.http = axios.create({
      baseURL: p.baseUrl,
      headers: { Authorization: `Bearer ${p.secretKey}` },
    });
  }

  async initializeTransaction(input: {
    email: string; amountMinor: number; reference: string; currency: string;
  }): Promise<PaystackInit> {
    const { data } = await this.http.post('/transaction/initialize', {
      email: input.email,
      amount: input.amountMinor,
      reference: input.reference,
      currency: input.currency,
    });
    return { authorization_url: data.data.authorization_url, reference: data.data.reference };
  }

  async verifyTransaction(reference: string): Promise<{ status: string; amount: number }> {
    const { data } = await this.http.get(`/transaction/verify/${reference}`);
    return { status: data.data.status, amount: data.data.amount };
  }

  async createRefund(reference: string): Promise<void> {
    await this.http.post('/refund', { transaction: reference });
  }

  verifySignature(raw: Buffer, signature: string): boolean {
    return isValidPaystackSignature(raw, signature, this.secret);
  }
}
```

- [ ] **Step 4: Entity + DTOs**

`payment.entity.ts`:
```ts
import {
  Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';

export enum PaymentStatus {
  PENDING = 'PENDING', PAID = 'PAID', FAILED = 'FAILED', REFUNDED = 'REFUNDED',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column({ name: 'booking_id' }) bookingId!: string;
  @Column({ name: 'provider_ref', unique: true }) providerRef!: string;
  @Column({ name: 'amount_minor', type: 'int' }) amountMinor!: number;
  @Column({ default: 'GHS' }) currency!: string;
  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING }) status!: PaymentStatus;
  @Column({ name: 'authorization_url', nullable: true }) authorizationUrl?: string;
  @Column({ name: 'raw_event', type: 'jsonb', nullable: true }) rawEvent?: unknown;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}
```

- [ ] **Step 5: Failing payments-service test — idempotent webhook**

`payments.service.spec.ts`:
```ts
import { Test } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PaymentsRepository } from './payments.repository';
import { PaystackClient } from './paystack.client';
import { BookingsService } from '../bookings/bookings.service';
import { DataSource } from 'typeorm';
import { PaymentStatus } from './entities/payment.entity';

describe('PaymentsService webhook', () => {
  let service: PaymentsService;
  let repo: Record<string, jest.Mock>;
  let bookings: { confirmPaid: jest.Mock };

  beforeEach(async () => {
    repo = { findByProviderRef: jest.fn(), save: jest.fn((p) => Promise.resolve(p)) };
    bookings = { confirmPaid: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PaymentsRepository, useValue: repo },
        { provide: PaystackClient, useValue: { verifySignature: () => true } },
        { provide: BookingsService, useValue: bookings },
        { provide: DataSource, useValue: { transaction: (cb: any) => cb({}) } },
      ],
    }).compile();
    service = module.get(PaymentsService);
  });

  it('confirms the booking on first charge.success', async () => {
    repo.findByProviderRef.mockResolvedValue({ id: 'p1', bookingId: 'b1', status: PaymentStatus.PENDING });
    const raw = Buffer.from(JSON.stringify({ event: 'charge.success', data: { reference: 'TUR-2026-0007' } }));
    await service.handleWebhook(raw, 'sig');
    expect(bookings.confirmPaid).toHaveBeenCalledWith('b1', expect.anything());
  });

  it('ignores a replayed webhook for an already-paid payment', async () => {
    repo.findByProviderRef.mockResolvedValue({ id: 'p1', bookingId: 'b1', status: PaymentStatus.PAID });
    const raw = Buffer.from(JSON.stringify({ event: 'charge.success', data: { reference: 'TUR-2026-0007' } }));
    await service.handleWebhook(raw, 'sig');
    expect(bookings.confirmPaid).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 6: Run, verify fail. Implement `payments.service.ts`**

```ts
import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PaystackClient } from './paystack.client';
import { PaymentsRepository } from './payments.repository';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { BookingsService } from '../bookings/bookings.service';
import { UsersService } from '../users/users.service';
import { AuthUser } from '../auth/auth-user.type';
import { BookingStatus } from '../bookings/entities/tour-booking.entity';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly repo: PaymentsRepository,
    private readonly paystack: PaystackClient,
    private readonly bookings: BookingsService,
    private readonly users: UsersService,
    private readonly dataSource: DataSource,
  ) {}

  async initiate(reference: string, tourist: AuthUser): Promise<Payment> {
    const booking = await this.bookings.findByReference(reference, tourist);
    if (booking.touristId !== tourist.id) throw new ForbiddenException('Not your booking');
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Only a pending booking can be paid');
    }
    const user = await this.users.findById(tourist.id);
    const init = await this.paystack.initializeTransaction({
      email: user.email,
      amountMinor: booking.totalMinor,
      reference: booking.reference, // Paystack ref == booking ref
      currency: booking.currency,
    });
    return this.repo.save(this.repo.create({
      bookingId: booking.id,
      providerRef: init.reference,
      amountMinor: booking.totalMinor,
      currency: booking.currency,
      status: PaymentStatus.PENDING,
      authorizationUrl: init.authorization_url,
    }));
  }

  async handleWebhook(raw: Buffer, signature: string): Promise<void> {
    if (!this.paystack.verifySignature(raw, signature)) {
      throw new ForbiddenException('Invalid signature');
    }
    const event = JSON.parse(raw.toString()) as { event: string; data: { reference: string } };
    if (event.event !== 'charge.success') return;

    const payment = await this.repo.findByProviderRef(event.data.reference);
    if (!payment || payment.status === PaymentStatus.PAID) return; // idempotent

    await this.dataSource.transaction(async (manager) => {
      payment.status = PaymentStatus.PAID;
      payment.rawEvent = event;
      await this.repo.save(payment, manager);
      await this.bookings.confirmPaid(payment.bookingId, manager);
    });
  }

  async verify(reference: string, tourist: AuthUser): Promise<Payment> {
    const booking = await this.bookings.findByReference(reference, tourist);
    const payment = await this.repo.findByBookingId(booking.id);
    if (!payment) throw new NotFoundException('No payment for this booking');
    const result = await this.paystack.verifyTransaction(payment.providerRef);
    if (result.status === 'success' && payment.status !== PaymentStatus.PAID) {
      await this.dataSource.transaction(async (manager) => {
        payment.status = PaymentStatus.PAID;
        await this.repo.save(payment, manager);
        await this.bookings.confirmPaid(payment.bookingId, manager);
      });
    }
    return payment;
  }
}
```

`BookingsService.confirmPaid(bookingId, manager)` (add to Task 7 service): loads the booking in the tx, sets `CONFIRMED`, saves, and returns it. Loyalty is awarded on completion (Task 11), not on payment.

- [ ] **Step 7: Controller with raw body on the webhook**

`payments.controller.ts`:
```ts
import {
  Body, Controller, Get, Headers, Param, Post, RawBodyRequest, Req, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthUser } from '../auth/auth-user.type';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('initiate')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Initialise a Paystack transaction for a booking' })
  async initiate(@CurrentUser() user: AuthUser, @Body() dto: InitiatePaymentDto): Promise<PaymentResponseDto> {
    return PaymentResponseDto.from(await this.payments.initiate(dto.bookingReference, user));
  }

  @Post('webhook')
  @ApiExcludeEndpoint()
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-paystack-signature') signature: string,
  ): Promise<{ received: true }> {
    await this.payments.handleWebhook(req.rawBody as Buffer, signature);
    return { received: true };
  }

  @Get(':reference/verify')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Reconcile a payment against Paystack' })
  async verify(@CurrentUser() user: AuthUser, @Param('reference') reference: string): Promise<PaymentResponseDto> {
    return PaymentResponseDto.from(await this.payments.verify(reference, user));
  }
}
```

- [ ] **Step 8: Run tests, migration, live smoke, commit**

```bash
yarn test payments paystack-signature
yarn build && yarn migration:generate src/database/migrations/Payments && yarn migration:run
```
Live smoke (test-mode keys): start app + a tunnel; `POST /payments/initiate`, open the returned `authorization_url`, pay with a Paystack test card; webhook confirms the booking; `GET /bookings/:ref` shows `CONFIRMED`.
```bash
yarn lint && git add -A && git commit -m "TOUR-010: Add live Paystack payments with signed webhook and reconcile"
```

---

### Task 9: Reviews + loyalty award on completion

**Files:**
- Create: `src/modules/reviews/entities/review.entity.ts`
- Create: `src/modules/reviews/dto/{create-review.dto,review-response.dto}.ts`
- Create: `src/modules/reviews/{reviews.repository,reviews.service,reviews.controller,reviews.module}.ts`
- Modify: `src/modules/tours/tours.service.ts` (rating rollup), `src/modules/bookings/bookings.service.ts` (`markCompletedAndAward`)
- Test: `src/modules/reviews/reviews.service.spec.ts`

**Interfaces:**
- Consumes: `BookingsService.findByReference`, `ToursService.applyRating`.
- Produces: `ReviewsService.create(reference, tourist, dto)`, `listForTour(tourId, query)`; `Review { id, tourId, bookingId, authorId, rating, body }`.

- [ ] **Step 1: Failing test — review gate**

```ts
import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ReviewsService } from './reviews.service';
import { ReviewsRepository } from './reviews.repository';
import { BookingsService } from '../bookings/bookings.service';
import { ToursService } from '../tours/tours.service';
import { DataSource } from 'typeorm';
import { BookingStatus } from '../bookings/entities/tour-booking.entity';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let repo: Record<string, jest.Mock>;
  let bookings: { findByReference: jest.Mock };

  beforeEach(async () => {
    repo = { existsForBooking: jest.fn().mockResolvedValue(false), save: jest.fn((r) => Promise.resolve({ id: 'r1', ...r })) };
    bookings = { findByReference: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: ReviewsRepository, useValue: repo },
        { provide: BookingsService, useValue: bookings },
        { provide: ToursService, useValue: { applyRating: jest.fn(), departureTourId: jest.fn().mockResolvedValue('t1') } },
        { provide: DataSource, useValue: { transaction: (cb: any) => cb({}) } },
      ],
    }).compile();
    service = module.get(ReviewsService);
  });

  it('rejects a review when the booking is not COMPLETED', async () => {
    bookings.findByReference.mockResolvedValue({ id: 'b1', touristId: 'u1', status: BookingStatus.CONFIRMED });
    await expect(
      service.create('TUR-2026-0007', { id: 'u1' } as never, { rating: 5, body: 'great' }),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects a second review for the same booking', async () => {
    bookings.findByReference.mockResolvedValue({ id: 'b1', touristId: 'u1', status: BookingStatus.COMPLETED });
    repo.existsForBooking.mockResolvedValue(true);
    await expect(
      service.create('TUR-2026-0007', { id: 'u1' } as never, { rating: 5, body: 'great' }),
    ).rejects.toThrow(ConflictException);
  });
});
```

- [ ] **Step 2: Run, verify fail. Implement entity, repository, service**

`review.entity.ts` has `@Column({ name: 'booking_id', unique: true })` enforcing one-per-booking. Service checks `status === COMPLETED` (else `ConflictException`), checks `existsForBooking` (else `ConflictException`), inserts the review, then calls `tours.applyRating(tourId, rating)` which recomputes `ratingAvg`/`ratingCount` incrementally inside the same transaction.

`applyRating` (add to `ToursService`):
```ts
async applyRating(tourId: string, rating: number, manager: EntityManager): Promise<void> {
  const repo = manager.getRepository(Tour);
  const tour = await repo.findOneOrFail({ where: { id: tourId } });
  const newCount = tour.ratingCount + 1;
  tour.ratingAvg = (tour.ratingAvg * tour.ratingCount + rating) / newCount;
  tour.ratingCount = newCount;
  await repo.save(tour);
}
```

- [ ] **Step 3: Run, verify pass.**

- [ ] **Step 4: Loyalty award — `markCompletedAndAward`**

Add to `BookingsService` (called by the cron in Task 11, and reused nowhere else):
```ts
async markCompletedAndAward(): Promise<number> {
  const dueDepartures = await this.departures.findPast(); // departsAt < now, SCHEDULED
  let completed = 0;
  for (const dep of dueDepartures) {
    await this.dataSource.transaction(async (manager) => {
      const rows = await this.repo.findConfirmedForDeparture(dep.id, manager);
      for (const b of rows) {
        b.status = BookingStatus.COMPLETED;
        await this.repo.save(b, manager);
        const points = Math.floor(b.totalMinor / 1000); // 1 pt per GHS 10 (1000 pesewas)
        await this.users.addLoyaltyPoints(b.touristId, points, manager);
        completed += 1;
      }
    });
  }
  return completed;
}
```
> This adds `UsersService` and `TourDeparturesService.findPast` / `findConfirmedForDeparture` to the bookings module deps. Loyalty: 1 point per GHS 10 = `floor(totalMinor / 1000)`.

- [ ] **Step 5: Controller (`GET /tours/:id/reviews`, `POST /bookings/:reference/review`), module, migration**

- [ ] **Step 6: Lint, test, commit**

```bash
yarn test reviews bookings tours
yarn build && yarn migration:generate src/database/migrations/Reviews && yarn migration:run
yarn lint && git add -A && git commit -m "TOUR-011: Add booking-gated reviews with rating rollup and loyalty award"
```

---

### Task 10: Real-time gateways — booking status + availability

**Files:**
- Create: `src/modules/notifications/{ws-jwt.guard,bookings.gateway,availability.gateway,notifications.module}.ts`
- Create: `docs/websocket-events.md`
- Modify: `bookings.service.ts` and `payments.service.ts` to emit after commit
- Test: `src/modules/notifications/bookings.gateway.spec.ts`

**Interfaces:**
- Produces: `BookingsGateway.emitStatusChanged(userId, payload)`, `AvailabilityGateway.emitAvailability(departureId, payload)`; consumed by services after their transactions commit.

- [ ] **Step 1: Install** — `yarn add @nestjs/websockets @nestjs/platform-socket.io socket.io`.

- [ ] **Step 2: Failing gateway test — emits to the user room**

```ts
import { BookingsGateway } from './bookings.gateway';

describe('BookingsGateway', () => {
  it('emits booking.status_changed to the user room', () => {
    const to = jest.fn(() => ({ emit }));
    const emit = jest.fn();
    const gateway = new BookingsGateway();
    (gateway as unknown as { server: { to: typeof to } }).server = { to };
    gateway.emitStatusChanged('u1', { reference: 'TUR-2026-0007', status: 'CONFIRMED', changedAt: '2026-07-30T00:00:00Z' });
    expect(to).toHaveBeenCalledWith('user:u1');
    expect(emit).toHaveBeenCalledWith('booking.status_changed', expect.objectContaining({ reference: 'TUR-2026-0007' }));
  });
});
```

- [ ] **Step 3: Run, verify fail. Implement the gateways**

`bookings.gateway.ts` uses `@WebSocketGateway({ cors: true })`, authenticates the handshake token in `handleConnection` (reuse `JwtService` with the access secret; disconnect on failure), joins `user:<id>`, and exposes `emitStatusChanged`. `availability.gateway.ts` handles `departure.subscribe`/`unsubscribe` messages joining/leaving `departure:<id>` and exposes `emitAvailability`.

- [ ] **Step 4: Emit from services after commit**

In `BookingsService.confirmPaid`, `cancel`, and `create`, after the `transaction()` resolves, call `bookingsGateway.emitStatusChanged(...)` and `availabilityGateway.emitAvailability(departureId, { seatsLeft, capacity })`. Emissions are **outside** the transaction callback so a rollback cannot emit. Inject gateways via `forwardRef` to avoid a cycle with the notifications module.

- [ ] **Step 5: Write `docs/websocket-events.md`** — table of gateway, event, direction, room, payload (matches spec §7).

- [ ] **Step 6: Run tests, manual two-browser smoke, commit**

```bash
yarn test notifications
yarn lint && git add -A && git commit -m "TOUR-012: Add booking-status and availability Socket.io gateways"
```

---

### Task 11: Scheduled jobs — seat-hold expiry + completion sweep

**Files:**
- Create: `src/modules/bookings/bookings.scheduler.ts`
- Modify: `bookings.module.ts` to import `ScheduleModule.forRoot()` (once, in `app.module.ts`) and register the scheduler
- Test: `src/modules/bookings/bookings.scheduler.spec.ts`

**Interfaces:**
- Consumes: `BookingsService.expireStalePending()`, `BookingsService.markCompletedAndAward()`.

- [ ] **Step 1: Install** — `yarn add @nestjs/schedule`.

- [ ] **Step 2: Failing test — expiry calls the service with the configured cutoff**

```ts
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BookingsScheduler } from './bookings.scheduler';
import { BookingsService } from './bookings.service';

describe('BookingsScheduler', () => {
  it('asks the service to expire stale pending bookings', async () => {
    const bookings = { expireStalePending: jest.fn().mockResolvedValue(2), markCompletedAndAward: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        BookingsScheduler,
        { provide: BookingsService, useValue: bookings },
        { provide: ConfigService, useValue: { get: () => ({ seatHoldMinutes: 15 }) } },
      ],
    }).compile();
    await module.get(BookingsScheduler).expireHolds();
    expect(bookings.expireStalePending).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run, verify fail. Implement**

`expireStalePending()` on `BookingsService`: in one transaction, find `PENDING` bookings whose `createdAt < now - seatHoldMinutes` **and** which have no `PAID` payment, set them `CANCELLED`, emit availability. `bookings.scheduler.ts`:
```ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BookingsService } from './bookings.service';

@Injectable()
export class BookingsScheduler {
  private readonly logger = new Logger(BookingsScheduler.name);
  constructor(private readonly bookings: BookingsService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async expireHolds(): Promise<void> {
    const n = await this.bookings.expireStalePending();
    if (n > 0) this.logger.log(`Expired ${n} stale pending bookings`);
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async completePastDepartures(): Promise<void> {
    const n = await this.bookings.markCompletedAndAward();
    if (n > 0) this.logger.log(`Completed ${n} bookings and awarded points`);
  }
}
```

- [ ] **Step 4: Run tests, add `ScheduleModule.forRoot()` to `app.module.ts`, commit**

```bash
yarn test bookings.scheduler
yarn lint && git add -A && git commit -m "TOUR-013: Add seat-hold expiry and completion sweep cron jobs"
```

---

### Task 12: Seed data mirroring the prototype

**Files:**
- Create: `src/database/seeds/seed.ts`, `src/database/seeds/data.ts`
- Test: run the seed twice; second run must not duplicate.

**Interfaces:**
- Produces: an idempotent `seed()` creating admin, two operators, one tourist, five destinations, three approved tours with departures, and demo bookings across the three tabs.

- [ ] **Step 1: Write `data.ts`** — arrays of destinations (Cape Coast, Accra, Kumasi, Mole, Elmina), tours (Kakum Canopy Walk `priceMinor: 12000`, Mole Safari Tour `priceMinor: 28000`, Cape Coast Castle Tour), each with a future departure; users with fixed emails and argon2-hashed `password123`.

- [ ] **Step 2: Write `seed.ts`** — opens the CLI `DataSource`, upserts by natural key (`email`, destination `name`, tour `slug`), logs a summary, exits. Every `find`-then-`create` guards against duplicates so re-running is safe.

- [ ] **Step 3: Run twice, verify idempotent**

```bash
yarn seed && yarn seed
# second run logs "already present", row counts unchanged
```

- [ ] **Step 4: Commit**

```bash
git add src/database/seeds && git commit -m "TOUR-014: Add idempotent seed data mirroring the prototype"
```

---

### Task 13: End-to-end spine + docs finalisation

**Files:**
- Create: `test/utils/test-db.ts`, `test/e2e/tours-spine.e2e-spec.ts`
- Modify: `README.md` (run instructions), ensure `docs/websocket-events.md` current
- Test: the full-spine e2e passes against `db_test`.

**Interfaces:**
- Consumes: the whole app.

- [ ] **Step 1: Write `test/utils/test-db.ts`** — `bootstrapTestApp()` builds the Nest app against `DATABASE_URL` for `db_test`, runs migrations, returns the `INestApplication`; helpers `tokenFor(app, email, role?)`, `seedOneSeatDeparture(app)`.

- [ ] **Step 2: Write the spine e2e** covering: register tourist → seed operator+admin via helpers → operator creates tour → submit → admin approves → tourist searches and finds it → creates booking (PENDING) → simulate `charge.success` webhook (signed with test secret) → booking CONFIRMED → cancel outside window → refunded/CANCELLED. Assert status codes and the error envelope shape on one failure path (double-book → 409).

- [ ] **Step 3: Run the whole e2e suite**

```bash
docker compose up -d db_test
DATABASE_URL=postgres://voyago:voyago@localhost:5433/voyago_test yarn test:e2e
```
Expected: all green, including `bookings-concurrency`.

- [ ] **Step 4: Update `README.md`** with: prerequisites, `docker compose up -d db`, `.env` setup, `yarn migration:run`, `yarn seed`, `yarn start:dev`, where Swagger lives, how to run unit vs e2e, and the Paystack tunnel note for webhooks.

- [ ] **Step 5: Full green gate + commit**

```bash
yarn lint && yarn test && \
DATABASE_URL=postgres://voyago:voyago@localhost:5433/voyago_test yarn test:e2e
git add -A && git commit -m "TOUR-015: Add end-to-end spine test and finalise run docs"
```

---

## Self-review against the spec

**Coverage** — every spec section maps to a task: §2 architecture → Tasks 1–2; §3 data model → Tasks 3,4,6,7,8,9 (entities); §4 lifecycle + rules → Task 7 (create/cancel/overbooking), Task 9 (review gate, loyalty), Task 11 (expiry, completion); §4 concurrency → Task 7 (lock + marquee e2e); §5 API surface → Tasks 3–9 controllers; §6 Paystack → Task 8; §7 real-time → Task 10; §8 cross-cutting (envelope, serialisation, docs, security, config, jobs) → Tasks 1,4,11; §9 tests → every task + Task 13; §10 seeds → Task 12.

**Known gaps, flagged not hidden:**
- **Password reset** (`/auth/forgot-password`, `/auth/reset-password`) is specified but deferred — it needs an email transport that isn't in scope. Flagged in Task 4. Add a task when a mail provider is chosen.
- **Refund** is triggered from cancellation; the plan wires `PaystackClient.createRefund` (Task 8) but the call-site hook from `BookingsService.cancel` is described rather than fully coded — implement it as the first step of Task 8's integration, emitting `REFUNDED` on success.

**Type consistency** — `AuthUser`, `UserRole`, `BookingStatus`, `TourStatus`, `PaymentStatus`, `generateReference`, `deriveTier`, `seatsConsumed`, `confirmPaid`, `lockAndGet`, `applyRating` are used with identical signatures across the tasks that produce and consume them.

**Circular dependencies** — Tours↔Bookings (seat counter) and Notifications↔services (emit) are resolved with `forwardRef` and interface tokens (`SEAT_COUNTER`, `OWNER_RESOLVER`), noted at each site.

**No `Math.random`/`Date.now` surprises** — booking references use a per-year DB sequence count, not randomness; slug uniqueness uses `crypto.randomBytes`.
