#!/bin/bash

# Script to refresh the Next.js container after making changes to static files
# This can be run manually after uploading new images if they're not showing properly

echo "Refreshing portfolio container..."

# Navigate to the project directory
cd "$(dirname "$0")/.."

# Invalidate Redis cache for projects
echo "Invalidating Redis cache..."
docker-compose exec redis redis-cli FLUSHALL

# Restart the portfolio container
echo "Restarting portfolio container..."
docker-compose restart portfolio

# Wait for the container to become healthy
echo "Waiting for container to be healthy..."
sleep 5

# Show container status
echo "Container status:"
docker-compose ps portfolio

echo "Refresh complete. If images still aren't showing, you may need to clear your browser cache or wait a few minutes." 