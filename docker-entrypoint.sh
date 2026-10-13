#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ] && [ "$DATABASE_URL" != "mysql://build:build@127.0.0.1:3306/build_db" ]; then
  echo "[entrypoint] Verifying database connection and applying schema..."
  max_retries=30
  retry=0
  until npx prisma db push --skip-generate --accept-data-loss || [ $retry -ge $max_retries ]; do
    echo "[entrypoint] Waiting for database to be ready... ($retry/$max_retries)"
    retry=$((retry + 1))
    sleep 2
  done

  echo "[entrypoint] Ensuring database seed data..."
  npx tsx prisma/seed.ts || echo "[entrypoint] Seed finished or partially initialized"
fi

exec "$@"
