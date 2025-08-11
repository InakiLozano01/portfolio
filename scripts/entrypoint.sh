#!/bin/sh

# Simple startup script used in Docker

echo 'Waiting for MongoDB and Redis to be ready...'
sleep 5

# Try to normalize permissions on bind-mounted images dir, but don't fail if not allowed
# Best-effort: ensure upload directory exists
mkdir -p /app/public/images/projects 2>/dev/null || true
chmod 755 /app/public/images /app/public/images/projects 2>/dev/null || true
find /app/public/images -type d -exec chmod 755 {} \; 2>/dev/null || true
find /app/public/images -type f -exec chmod 644 {} \; 2>/dev/null || true

# Use Next.js standalone server from .next/standalone
node server.js &
srv=$!

# Health log
echo "Server started with PID $srv"
wait $srv
