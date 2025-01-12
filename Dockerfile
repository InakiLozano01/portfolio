FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

RUN if [ "$(uname -m)" = "x86_64" ]; then \
        npm install @next/swc-linux-x64-musl; \
    elif [ "$(uname -m)" = "aarch64" ]; then \
        npm install @next/swc-linux-arm64-musl; \
    fi

# Install dependencies
COPY package*.json ./
RUN npm ci --include=dev

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Temporarily set NODE_ENV to development to ensure devDependencies are available
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for better logging
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_SHARP_PATH=/app/node_modules/sharp

# Install SWC binary for Alpine based on architecture
RUN apk add --no-cache libc6-compat

# Now set NODE_ENV to production for the build
ENV NODE_ENV=production
COPY .env.production .env

# Build the application
RUN npm run build

# Production image, copy all files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/models ./models
COPY --from=builder /app/data ./data
COPY --from=builder /app/.env ./.env
COPY --from=builder /app/tsconfig*.json ./
COPY --from=builder /app/package*.json ./

# Ensure data directory has correct permissions
RUN chown -R nextjs:nodejs ./data ./scripts ./lib ./models

# Install only the necessary dependencies for running scripts
RUN npm install -g ts-node typescript
RUN npm install --production=false @types/node tsconfig-paths

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# These environment variables will be overridden by docker-compose
ENV SKIP_REDIS_DURING_BUILD=""
ENV SKIP_DB_DURING_BUILD=""
ENV MONGODB_URI=""
ENV REDIS_URL=""

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Use a shell to run the application so we can see logs
CMD ["sh", "-c", "node server.js"] 