# Portfolio

This is a Next.js and TypeScript portfolio application. It uses MongoDB and Redis for data storage and caching and is fully containerised with Docker.

## Setup

1. Build and run the stack through Docker Compose:
   ```bash
   docker compose up -d --build
   ```
2. Copy the environment example file and update the values:
   ```bash
   cp .env.example env.local
   ```
3. Do not run `npm`, `next`, `jest`, or TypeScript checks directly on the VPS host. Use capped Docker commands from this project directory.

## Environment variables

All required variables are documented in `.env.example`. They include database URLs, NextAuth configuration and flags used during the build.

An additional `GOOGLE_AI_API_KEY` is required for comment moderation.


## Development workflow

- `docker compose up -d --build` – build and run the full stack
- `/home/ubuntu/vps/scripts/vps-typecheck.sh /home/ubuntu/vps/portfolio` – run the capped TypeScript check
- `docker compose run --rm portfolio npm test` – run unit tests inside the capped app service

## Testing

Tests live under `__tests__` and cover API routes and components. A minimal Jest setup is provided. Continuous integration can be added to automatically run these tests on every push.

## Docker

Docker and `docker-compose.yml` are provided. The application image uses environment variables defined in `env.production`. Run the stack with `docker compose up -d --build`.
The container starts via `/app/scripts/entrypoint.sh`, which waits for MongoDB and Redis, fixes image permissions and then runs the server.

## Comments

Visitors can leave comments on blog posts using an alias. Comments are moderated through Google AI Studio (Gemma) and basic rate limiting prevents spam.
