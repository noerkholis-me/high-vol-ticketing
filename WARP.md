# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project overview

High-Volume Ticketing Engine is a NestJS + TypeScript backend for handling high-concurrency "ticket war" scenarios with strong data consistency guarantees. It combines:

- PostgreSQL (via Prisma) for persistent state
- Redis for caching, distributed locking, and queues (BullMQ)
- Prometheus + Grafana for metrics and dashboards
- Docker Compose to run the full stack (app, Postgres, Redis, monitoring, Redis Insight)

Primary domain modules live under `src/modules`:

- `auth`: registration, login, email verification, JWT issuing/refresh, logout, role/permission management
- `booking`: seat reservation with Redis-backed optimistic locking and BullMQ-based auto-cleanup
- `event`: event CRUD and bulk seat generation
- `payment`: booking confirmation, finalizing seat status, and metrics
- `rbac`: permission-based access control on top of JWT-authenticated users

Key reference docs:

- `docs/architecture.md`: deeper explanation of Redis caching/locking, booking lifecycle, and BullMQ cleanup
- `docs/api.md`: API conventions (response shape, error format, common flows) and Swagger entrypoints
- `README.md`: end-to-end setup, commands, endpoints, monitoring URLs, and performance metrics

If documentation and code disagree (e.g., around authentication or rate limiting), prefer the current code.

---

## Commands & workflows

All commands are run from the project root unless noted otherwise.

### Install & build

- Install dependencies:
  - `npm install`
- Build the NestJS app:
  - `npm run build`
- Start in production mode using the built output:
  - `npm run start:prod`

### Local development (without Docker)

- Start the API in watch mode:
  - `npm run start:dev`
- Plain start (no watch):
  - `npm run start`
- Debug mode (Node inspector + watch):
  - `npm run start:debug`

You must have a reachable Postgres instance and Redis (matching the `DATABASE_URL`, `REDIS_HOST`, `REDIS_PORT` in `.env`) for most flows to work.

### Docker Compose stack

Full local stack (app + Postgres + Redis + monitoring) is defined in `docker-compose.yml`.

- Start all services in the background:
  - `docker-compose up -d`
- Rebuild the app image and restart:
  - `docker-compose up -d --build`
- Stop everything:
  - `docker-compose down`
- Tail logs for a specific service (e.g., app):
  - `docker-compose logs -f app`

The compose file exposes:

- API: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/api/docs`
- Postgres: `localhost:2010` (inside Docker: `postgres:5432`)
- Redis: `localhost:6379`
- Redis Insight: `http://localhost:5540`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001` (admin/admin by default)
- Prisma Studio (when run): `http://localhost:5555`

### Prisma & database

Prisma is configured via `prisma.config.ts` and the `prisma/` directory.

Common workflows:

- Generate Prisma client (after editing `prisma/schema.prisma`):
  - `npm run prisma:generate`
- Apply migrations in dev (creates/updates `prisma/migrations/`):
  - `npm run prisma:migrate`
- Push schema changes directly to the database (no migration files):
  - `npm run prisma:push`
- Reset DB and reapply migrations (destructive in dev):
  - `npm run prisma:reset`
- Open Prisma Studio:
  - `npm run prisma:studio`

Seeding:

- Migrations are configured to use `tsx prisma/seed.ts` as the seed command (see `prisma.config.ts`). Keep seed logic in that file.

### Linting & formatting

- Lint TypeScript sources and tests (and auto-fix where possible):
  - `npm run lint`
- Format code with Prettier (targets `src/**/*.ts` and `test/**/*.ts`):
  - `npm run format`

### Unit, e2e, and load testing

Jest is configured in `jest.config.js` (unit tests under `src`, `*.spec.ts`). E2E tests live in `test/` with a separate Jest config referenced by the `test:e2e` script.

- Run all unit tests:
  - `npm run test`
- Watch mode for unit tests:
  - `npm run test:watch`
- Unit tests with coverage:
  - `npm run test:cov`
- Run e2e tests (uses `test/jest-e2e.json`):
  - `npm run test:e2e`

Targeted Jest runs (single file or pattern):

- Run tests in a specific spec file (example):
  - `npm test -- src/modules/booking/booking.service.spec.ts`
- Filter by test name or path (Jest CLI feature), e.g.:
  - `npm test -- --testNamePattern="Booking"`

Load testing with k6 (see `load.test.js` and README for details):

- Default load test:
  - `k6 run load.test.js`
- Custom VUs/duration example:
  - `k6 run --vus 200 --duration 30s load.test.js`

---

## High-level architecture

### Application bootstrap

- `src/main.ts` creates the Nest application from `AppModule`, wires cross-cutting concerns, and exposes the API:
  - Global prefix: `/api/v1`
  - CORS enabled
  - Globally applied `ValidationPipe` with whitelisting, unknown/extra property rejection, and implicit type conversion
  - Global `TransformInterceptor` to normalize successful responses into `{ statusCode, message, data }`
  - Global `AllExceptionsFilter` to normalize errors into `{ statusCode, message, error, timestamp, path }`
  - Swagger document at `/api/docs`

### Root module wiring

`src/app.module.ts` is the composition root and wires infrastructure and domain modules:

- `ConfigModule.forRoot({ isGlobal: true, envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' })`
  - Environment-driven configuration; tests use `.env.test` by default.
- `RedisModule.forRootAsync`
  - Injects `ConfigService` to connect to Redis at `REDIS_HOST`/`REDIS_PORT`.
  - Provides `RedisService` used across modules for cache/locks/blacklists.
- `BullModule.forRootAsync`
  - Connects BullMQ to the same Redis instance for background processing.
- `ThrottlerModule.forRoot`
  - Global rate limiting (currently 100 requests per 60 seconds) using in-memory storage.
- `PrometheusModule.register()`
  - Enables Prometheus metric collection; custom counters/gauges are registered from feature modules.
- `PrismaModule`
  - Global `PrismaService` wrapper over Prisma client using `@prisma/adapter-pg` and `pg` connection pooling.
- Domain modules: `AuthModule`, `BookingModule`, `PaymentModule`, `EventModule`.

### Data access & persistence

- All database access should go through `PrismaService` from `src/prisma/prisma.service.ts`.
  - It connects using `process.env.DATABASE_URL`.
  - Implements `OnModuleInit` / `OnModuleDestroy` to manage the connection lifecycle and logs DB connectivity events.
- Generated Prisma client and models are in `src/generated/prisma/`.
  - Treat this directory as generated code; don't edit manually.
  - Change `prisma/schema.prisma` + regenerate instead.

### Cross-cutting common layer

`src/common` contains building blocks shared by many modules:

- `filters/http-exception.filter.ts` (`AllExceptionsFilter`): global exception filter that maps thrown `HttpException`s and unknown errors into a uniform JSON structure.
- `interceptors/transform.interceptor.ts` (`TransformInterceptor`): wraps all successful HTTP responses in a `{ statusCode, message, data }` envelope.
  - When adding new controllers/services, prefer returning objects with `message` and/or `data` fields so the interceptor can map them cleanly.
- `types/auth.types.ts`: shared types for authenticated users and JWT payloads.
- `constants/redis-scripts.ts`: Lua script(s) for advanced Redis-based ticket reservation logic.

### Auth & RBAC model

Authentication and authorization are split across `auth` and `rbac` modules.

- `AuthModule` (`src/modules/auth`):
  - `AuthService` handles registration, login, email verification, refresh token issuing, logout, and role-permission management, all backed by Prisma.
  - Uses `JwtService` and `ConfigService` with `JWT_SECRET` for signing both access and refresh tokens.
  - Uses `RedisService` to blacklist tokens on logout and to support email verification flows.
  - Uses `BullModule.registerQueue({ name: 'email' })` and `EmailProcessor` to offload email sending.
  - `AuthController` exposes routes for register/login/verify/refresh/logout and admin role-permission management.
  - Cookies (`accessToken`, `refreshToken`) are set/cleared on login/refresh/logout; the JWT strategy also supports Bearer tokens.

- JWT strategy/guard:
  - `JwtStrategy` (in `auth/strategies/jwt.strategy.ts`) validates JWTs from Authorization header or `accessToken` cookie.
  - `JwtAuthGuard` extends `AuthGuard('jwt')` to centralize logging and error handling, returning an `AuthenticatedUser`.

- RBAC:
  - `RbacGuard` (in `rbac/guards/rbac.guard.ts`) reads required permissions from metadata set via the `@Permissions(...)` decorator and checks them against the user's roles/permissions stored in the database (`userRole.role.permissions`).
  - Per-request user context comes from `JwtStrategy` and is typed as `AuthenticatedUser`.
  - If no permissions metadata is present, `RbacGuard` allows the request; otherwise, it enforces that the user has *all* required permissions.

When adding a protected endpoint, the typical pattern is:

- Annotate with `@UseGuards(JwtAuthGuard, RbacGuard)`.
- Attach `@Permissions('some:permission:string')`.
- Use `@CurrentUser('userId')` to obtain the authenticated user ID.

### Booking, payment, and concurrency model

The high-volume part of the system lives mostly in `booking` and `payment` modules, with Redis and BullMQ providing concurrency control and cleanup.

#### Booking module

- `BookingController` exposes:
  - `POST /booking`: create booking for an authenticated user and a given `seatId`; guarded by `JwtAuthGuard` + `RbacGuard` with `booking:create:own` permission.
  - `GET /booking`: list currently available seats.
- `BookingService` implements the core flow:
  - Uses `RedisService` to:
    - Check `status:seat:{seatId}` cache before hitting the DB; if `RESERVED` or `SOLD`, rejects early.
    - Acquire a short-lived distributed lock `lock:seat:{seatId}` via `SET ... EX 5 NX`; if lock is held, rejects with a concurrency error.
  - Inside a Prisma transaction:
    - Verifies the seat exists and is `AVAILABLE`.
    - Updates the seat to `RESERVED` using optimistic concurrency via a `version` field.
    - Creates a `booking` row with status `PENDING` and an `expiresAt` ~15 minutes in the future.
  - After the transaction:
    - Sets Redis cache `status:seat:{seatId} = RESERVED` with a TTL matching the booking window.
    - Enqueues a `cleanup` job on the `ticket-cleanup` queue with a matching delay to auto-release if payment never arrives.
  - Always releases the `lock:seat:{seatId}` key in a `finally` block.

- `BookingProcessor` (`@Processor('ticket-cleanup')`) runs in BullMQ workers:
  - On `cleanup` jobs, loads the booking; if still `PENDING`, it:
    - Updates the seat back to `AVAILABLE` and marks the booking as `EXPIRED` inside a transaction.
    - Clears the `status:seat:{seatId}` key in Redis to keep cache and DB in sync.

Redis Lua scripts in `common/constants/redis-scripts.ts` provide an alternative or more advanced lock/reserve mechanism when needed.

#### Payment module

- `PaymentController` exposes `POST /payment/:bookingId/confirm` to confirm a booking.
- `PaymentService`:
  - Wraps the confirmation in a Prisma transaction:
    - Ensures the booking exists and is still `PENDING`.
    - Updates booking status to `CONFIRMED` and the associated seat status to `SOLD`.
    - Updates Redis to `status:seat:{seatId} = SOLD` to reflect final state.
  - Increments the Prometheus counter `tickets_sold_total` (registered in `PaymentModule`) for monitoring.

The combination of Redis locks, cache, Prisma transactions, and delayed cleanup jobs is what enforces correctness under high concurrency.

### Event module

- `EventController` provides:
  - Public listing of upcoming events with counts of available seats.
  - Fetching a single event with its seats.
  - Organizer-only endpoints for creating events and bulk-creating seats, guarded via JWT + RBAC (permissions like `event:create`, `event:create:own`).
- `EventService` uses Prisma to:
  - Create events and associated seats.
  - Compute available-seat counts via `_count` on relations.
  - Generate many seats in bulk for load-testing scenarios.

### Testing setup

- Unit tests live alongside implementation files as `*.spec.ts` under `src/`.
- Jest root directory is `src` (see `jest.config.js`).
  - `testRegex: ".*\.spec\.ts$"` limits standard unit specs.
  - `moduleNameMapper` remaps some internal generated Prisma module paths and replaces `uuid` with `test/mocks/uuid.ts` to make IDs deterministic in tests.
- E2E tests live under `test/` (e.g. `test/app.e2e-spec.ts`) and bootstrap a real Nest app via `AppModule`.

---

## API conventions & docs

- All HTTP routes are versioned under `/api/v1` (see `main.ts`).
- Successful responses are wrapped by `TransformInterceptor` into:
  - `{ statusCode: number, message: string, data: any }`.
- Errors are shaped by `AllExceptionsFilter` as:
  - `{ statusCode, message, error, timestamp, path }`.
- Swagger is configured via `@nestjs/swagger` in `main.ts` and controller decorators (`@ApiTags`, `@ApiOperation`, `@ApiResponse`, etc.).

For up-to-date endpoint lists, request/response schemas, and manual testing, prefer:

- Local Swagger UI: `http://localhost:3000/api/docs`
- `docs/api.md` for examples of full flows (e.g., booking then payment) and response shapes.

When modifying or adding endpoints, keep the documented envelope and error formats aligned with `docs/api.md` and the global interceptor/filter behavior.