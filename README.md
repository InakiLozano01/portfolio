# Portfolio

This is a Next.js and TypeScript portfolio application. It uses PostgreSQL for persistence and Redis for caching, and runs in Docker. Mongoose supplies document validation; it does not connect to MongoDB.

## Setup

1. Configure private runtime environment files outside Git. PostgreSQL uses `DATABASE_URL`; authentication uses `NEXTAUTH_URL` and `NEXTAUTH_SECRET`. Keep `.env` and `.env.production` private and ignored.
2. Follow [PostgreSQL deployment and recovery](docs/postgres-migration.md). `compose.postgres-app.yml` deploys the reviewed application image against the existing PostgreSQL and Redis services. Supply the image and private environment paths using a deployment env file. The legacy `docker-compose.yml` describes the former MongoDB stack and must not replace the migrated deployment.
3. Do not run `npm`, `next`, `jest`, or TypeScript checks directly on the VPS host. Use capped Docker containers with CPU, memory, swap and PID limits.

## Environment variables

Comment moderation requires the server-only `OPENROUTER_API_KEY` and `OPENROUTER_MODERATION_MODEL=typesafe/jev-1.13`. These settings belong in ignored runtime environment files. Do not supply secrets in Docker build arguments or client code.

## Development workflow

- Run `npm run lint`, `npx tsc --noEmit`, `npm test -- --runInBand`, `npm run test:postgres` and `npm run build` in an isolated, capped build container.
- Use a separate Compose project and test database for candidate validation; keep production services independent.

## Testing

Tests live under `__tests__` and cover API routes, moderation and components. PostgreSQL and invoice checks are documented in [persistence recovery](docs/postgres-migration.md) and [invoices](docs/invoices.md).

## Docker

The container starts through `/app/scripts/entrypoint.sh`, runs the standalone Next.js server and optionally enables the existing contact retention policy. Replace the application image through `compose.postgres-app.yml`; preserve database volumes and private environments during deployment or rollback.

## Comments

Visitors can leave comments on blog posts using an alias. OpenRouter Jev classifies seven moderation categories and decides whether to publish, request review or deny publication. Provider failures remain pending review. Administrators can override decisions with an audit history. See [the moderation release](docs/admin-release-2026-10-05.md).

## Admin and invoices

The admin loads project and blog summaries, retrieves full content when opening an editor, and caches summaries briefly during navigation. Invoice creation and payment tracking are available under `/admin#invoices`. PDF export retains the font requirements documented in [invoices](docs/invoices.md). See [admin usability verification](docs/admin-usability-2026-10-05.md).
