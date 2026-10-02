#!/bin/sh

# Simple startup script used in Docker

echo 'Starting portfolio with PostgreSQL and Redis...'

# Try to normalize permissions on bind-mounted images dir, but don't fail if not allowed
# Best-effort: ensure upload directory exists
mkdir -p /app/public/images/projects /app/public/images/blogs 2>/dev/null || true

# Retain the pre-existing 30-day contact expiry policy only after recovery.
if [ "$PORTFOLIO_CONTACT_RETENTION_ENABLED" = "true" ]; then
  node /app/scripts/postgres-retention.cjs &
  retention_pid=$!
  node server.js &
  server_pid=$!
  trap 'kill "$retention_pid" "$server_pid" 2>/dev/null || true' TERM INT
  wait "$server_pid"
  status=$?
  kill "$retention_pid" 2>/dev/null || true
  exit "$status"
fi

# Use Next.js standalone server.
exec node server.js
