# Portfolio

This is a Next.js and TypeScript portfolio application. It uses MongoDB and Redis for data storage and caching and is fully containerised with Docker.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the environment example file and update the values:
   ```bash
   cp .env.example env.local
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

You can also start the full stack using Docker:
```bash
docker-compose up --build
```

## Environment variables

All required variables are documented in `.env.example`. They include database URLs, NextAuth configuration and flags used during the build.
An additional `GOOGLE_AI_API_KEY` is required for comment moderation.

## Development workflow

- `npm run dev` – run Next.js in development mode
- `npm run lint` – run ESLint
- `npm test` – run unit tests (Jest + React Testing Library)
- `npm run build` – build the application

## Testing

Tests live under `__tests__` and cover API routes and components. A minimal Jest setup is provided. Continuous integration can be added to automatically run these tests on every push.

## Docker

Docker and `docker-compose.yml` are provided. The application image uses environment variables defined in `env.production`. Run the stack with `docker-compose up --build`.

## Comments

Visitors can leave comments on blog posts using an alias. Comments are moderated through Google AI Studio (Gemma) and basic rate limiting prevents spam.

