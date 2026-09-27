#!/bin/sh
set -e

echo "==> Running Prisma migrations..."
cd /app/server && npx prisma migrate deploy

echo "==> Starting NestJS..."
exec node /app/server/dist/main.js
