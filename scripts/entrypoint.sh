#!/bin/sh

# Simple startup script used in Docker

echo 'Waiting for MongoDB and Redis to be ready...'
sleep 5
find /app/public/images -type d -exec chmod 755 {} \;
find /app/public/images -type f -exec chmod 644 {} \;
exec node server.js
