#!/bin/sh

# Simple startup script used in Docker

echo 'Waiting for MongoDB and Redis to be ready...'
sleep 5

# Try to normalize permissions on bind-mounted images dir, but don't fail if not allowed
if [ -d /app/public/images ] && [ -w /app/public/images ]; then
  find /app/public/images -type d -exec chmod 755 {} \; 2>/dev/null || true
  find /app/public/images -type f -exec chmod 644 {} \; 2>/dev/null || true
else
  echo 'Skipping chmod on /app/public/images (not writable inside container)'
fi

exec node server.js
