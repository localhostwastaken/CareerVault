#!/bin/sh
set -e

echo "==> Running Prisma migrations..."
cd /app/server && npx prisma migrate deploy

echo "==> Starting services via supervisord..."
exec supervisord -n -c /etc/supervisord.conf
