#!/bin/sh
set -e

echo "Running Prisma migrations..."
until npm run db:migrate; do
  echo "Postgres not ready yet — retrying in 2s..."
  sleep 2
done

echo "Starting application..."
exec "$@"
