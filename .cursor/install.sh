#!/usr/bin/env bash
# Repository bootstrap for the ida-jobb Cloud Agent environment.
# Idempotent: ensures PostgreSQL is installed and installs JS dependencies.
# Runs from the repo root after checkout (and at build time for environment builds).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# --- System dependency: PostgreSQL (local dev database) ---
if ! command -v pg_ctlcluster >/dev/null 2>&1; then
  echo "[install] Installing PostgreSQL"
  export DEBIAN_FRONTEND=noninteractive
  sudo apt-get update -qq
  sudo apt-get install -y -qq postgresql postgresql-contrib
else
  echo "[install] PostgreSQL already installed"
fi

# --- JS toolchain + dependencies ---
echo "[install] Enabling corepack (pnpm)"
corepack enable

echo "[install] Installing JS dependencies (pnpm --frozen-lockfile)"
pnpm install --frozen-lockfile

echo "[install] Done"
