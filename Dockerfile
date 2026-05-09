FROM node:20-alpine AS base

# ---------- deps ----------
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

COPY package*.json ./
RUN npm ci --include=dev --omit=peer

# ---------- builder ----------
FROM node:20-alpine AS builder
WORKDIR /app

# Build-time toggles (true during build)
ARG SKIP_DB_DURING_BUILD=true
ARG SKIP_REDIS_DURING_BUILD=true
ENV SKIP_DB_DURING_BUILD=$SKIP_DB_DURING_BUILD
ENV SKIP_REDIS_DURING_BUILD=$SKIP_REDIS_DURING_BUILD

ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_SHARP_PATH=/app/node_modules/sharp
ENV NEXT_BUILD_WORKERS=1
RUN apk add --no-cache libc6-compat

# Production build. Do NOT copy .env.production into the image.
ENV NODE_ENV=production
ENV BROWSERSLIST_IGNORE_OLD_DATA=1
RUN npm run build
RUN ls -la public/ || true

# ---------- runner ----------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV SHARP_IGNORE_GLOBAL_LIBVIPS=1

RUN apk add --no-cache ffmpeg

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/models ./models
COPY --from=builder /app/data ./data
COPY --from=builder /app/tsconfig*.json ./
COPY --from=builder /app/package*.json ./
# permissions
RUN chmod +x /app/scripts/entrypoint.sh || true
RUN mkdir -p ./public/images/projects && chown -R nextjs:nodejs ./public/images && chmod -R 755 ./public/images
RUN chown -R nextjs:nodejs ./data ./scripts ./lib ./models
RUN chown -R nextjs:nodejs ./public && chmod -R 755 ./public

RUN mkdir .next && chown nextjs:nodejs .next

# Next.js output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/sharp ./node_modules/sharp
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@img ./node_modules/@img

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# runtime env provided by compose; keep empty defaults
ENV SKIP_REDIS_DURING_BUILD=""
ENV SKIP_DB_DURING_BUILD=""
ENV MONGODB_URI=""
ENV REDIS_URL=""

CMD ["sh", "/app/scripts/entrypoint.sh"]
