#!/bin/sh
set -e

echo "Running Prisma migrations..."
until npx prisma migrate deploy; do
  echo "Postgres not ready yet — retrying in 2s..."
  sleep 2
done

echo "Starting application..."
exec "$@"
