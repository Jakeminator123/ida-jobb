#!/usr/bin/env bash
# Per-boot startup for the ida-jobb Cloud Agent environment.
# Idempotent: starts local PostgreSQL, ensures the app role/database/tables
# exist, and makes DATABASE_URL available to Next.js via .env.local.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

PG_VER="$(ls /usr/lib/postgresql/ 2>/dev/null | sort -V | tail -1 || true)"
PG_VER="${PG_VER:-16}"
DB_NAME="ida_jobb"
DB_USER="ida"
DB_PASS="ida"

echo "[start] Starting PostgreSQL cluster ${PG_VER}/main"
sudo pg_ctlcluster "${PG_VER}" main start 2>/dev/null || true

echo "[start] Waiting for PostgreSQL to accept connections"
for _ in $(seq 1 30); do
  if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then break; fi
  sleep 1
done
pg_isready -h localhost -p 5432

echo "[start] Ensuring role and database exist"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}';"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 \
  || sudo -u postgres createdb -O "${DB_USER}" "${DB_NAME}"

echo "[start] Applying schema (idempotent)"
PGPASSWORD="${DB_PASS}" psql -h localhost -U "${DB_USER}" -d "${DB_NAME}" \
  -v ON_ERROR_STOP=1 -f .cursor/init-db.sql >/dev/null

echo "[start] Ensuring DATABASE_URL in .env.local"
touch .env.local
if ! grep -q '^DATABASE_URL=' .env.local; then
  echo "DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}" >> .env.local
fi

echo "[start] Ready. Next.js dev server is launched via the 'next-dev' terminal."
