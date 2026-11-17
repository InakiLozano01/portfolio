FROM node:26.12.1-alpine@sha256:9bd229b644e391df00fb989efa732335aefc6170a05d8c163c5c8ca9870da401 AS base
RUN apk upgrade --no-cache

# ---------- deps ----------
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

COPY package*.json ./
COPY patches ./patches
RUN npm ci --include=dev --omit=peer --ignore-scripts && node node_modules/patch-package/index.js --error-on-fail

# ---------- builder ----------
FROM base AS builder
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
FROM base AS runner
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /usr/local/lib/node_modules/pnpm /usr/local/lib/node_modules/yarn /root/.cache/node/corepack /opt/yarn-* \
 && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/pnpm /usr/local/bin/pnpx /usr/local/bin/yarn /usr/local/bin/yarnpkg
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
COPY --from=builder /app/assets/invoices ./assets/invoices
COPY --from=builder /app/tsconfig*.json ./
COPY --from=builder /app/package*.json ./
# permissions
RUN chmod +x /app/scripts/entrypoint.sh || true
RUN mkdir -p ./public/images/projects ./public/images/blogs && chown -R nextjs:nodejs ./public/images && chmod -R 755 ./public/images
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
ENV DATABASE_URL=""
ENV REDIS_URL=""

CMD ["sh", "/app/scripts/entrypoint.sh"]
