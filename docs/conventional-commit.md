# Conventional Commits Guide

This project uses [Conventional Commits](https://www.conventionalcommits.org/) to keep git history readable and consistent.

## Format

`<type>(<scope>): <short summary>`

Examples:

- `feat(booking): add endpoint to cancel booking`
- `fix(auth): return 401 on invalid JWT`
- `docs(readme): add Authorization example on protected route`

## Types

- `feat` – new feature
- `fix` – bug fix
- `refactor` – internal code changes that don’t add features or fix bugs
- `test` – add or update tests
- `docs` – documentation changes
- `chore` – tooling, configs, dependencies, CI, etc.

## Scopes

Use the scope to indicate the main area impacted.

### Domain / modules

- `booking` – booking flows, controllers, services, DTOs
  - `feat(booking): add bookings pending and expired metrics`
- `event` – event management, seats, capacity logic
  - `feat(event): add limit for 10 available seats per request`
- `auth` – authentication, authorization, guards, permissions
  - `feat(auth): add guard and permissions for booking confirm endpoint`
- `user` – user profile/account logic (if applicable)

### Cross-cutting backend

- `api` – global API behavior (interceptors, filters, response shapes)
- `config` – env config, Jest/Nest config, Prisma config
  - `feat(config): add testing environment configuration`
- `db` / `prisma` – schema, migrations, seeds
  - `feat(db): add createdAt and updatedAt fields to booking table`
- `monitoring` / `metrics` – Prometheus, Grafana, metrics code

### Testing & load testing

- `test` – cross-module tests or generic test changes
  - `test: increase e2e coverage for booking and auth`
- `booking`, `event`, etc. – when tests are specific to one module
  - `test(booking): add more tests to fulfill coverage`
- `load-test` / `k6` – k6 scripts, thresholds, scenarios
  - `feat(load-test): add conflict booking scenario in k6`

### DevOps / infra / tooling

- `docker` / `docker-compose` – Dockerfile, docker-compose
  - `chore(docker-compose): add prometheus and grafana volumes`
- `build` – build pipeline, tsconfig, build tooling
  - `chore(build): add @golevelup/ts-jest`
- `ci` / `github-actions` – CI workflows
  - `fix(ci): run e2e tests with correct JWT secret`
- `lint` / `tooling` – ESLint, Prettier, scripts, Husky

### Documentation

- `readme` – main README docs
  - `docs(readme): add skill showcase`
- `architecture` – system/architecture docs
  - `docs(architecture): fix inconsistencies with current code`
- `api` – API usage examples and contracts
  - `docs(api): add example of how to add JWT token`
- `monitoring`, `k6` – monitoring & load test docs
  - `docs(monitoring): add performance load test result`
  - `docs(k6): update k6 summary`

## Guidelines

- Prefer an existing scope over inventing a new one.
- If multiple areas are affected, pick the **primary** scope.
- If nothing fits well, use a broader scope like `core` or `deps`, for example:
  - `refactor(core): extract shared logging module`
  - `chore(deps): update NestJS and Prisma`
