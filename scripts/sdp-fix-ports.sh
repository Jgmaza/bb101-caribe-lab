#!/usr/bin/env bash
# Ajusta el .env de SDP a puertos libres en la Mac de José
# (Grafana=3000, Node=3001, algo en 8000/5432).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEV="$ROOT/infra/stellar-disbursement-platform-backend/dev"

# Preferir .env.orilla-local, si no .env
ENV_FILE=""
for f in "$DEV/.env.orilla-local" "$DEV/.env"; do
  if [[ -f "$f" ]]; then
    ENV_FILE="$f"
    break
  fi
done

if [[ -z "$ENV_FILE" ]]; then
  echo "No hay .env todavía. Corre primero: make setup"
  echo "Setup name sugerido: orilla-local"
  exit 1
fi

echo "Parcheando puertos en: $ENV_FILE"

# UI dashboard
if grep -q '^SDP_UI_BASE_URL=' "$ENV_FILE"; then
  sed -i.bak 's|^SDP_UI_BASE_URL=.*|SDP_UI_BASE_URL=http://localhost:3020|' "$ENV_FILE"
else
  echo 'SDP_UI_BASE_URL=http://localhost:3020' >> "$ENV_FILE"
fi

# Host port mapping for frontend compose
if grep -q '^SDP_UI_HOST_PORT=' "$ENV_FILE"; then
  sed -i.bak 's|^SDP_UI_HOST_PORT=.*|SDP_UI_HOST_PORT=3020|' "$ENV_FILE"
else
  echo 'SDP_UI_HOST_PORT=3020' >> "$ENV_FILE"
fi

# API (8000 ocupado)
if grep -q '^PORT=' "$ENV_FILE"; then
  sed -i.bak 's|^PORT=.*|PORT=8001|' "$ENV_FILE"
else
  echo 'PORT=8001' >> "$ENV_FILE"
fi

if grep -q '^BASE_URL=' "$ENV_FILE"; then
  sed -i.bak 's|^BASE_URL=.*|BASE_URL=http://localhost:8001|' "$ENV_FILE"
else
  echo 'BASE_URL=http://localhost:8001' >> "$ENV_FILE"
fi

# Postgres host publish (5432 ocupado) — solo para tools en host; el container sigue en db:5432
if grep -q '^SDP_DB_HOST_PORT=' "$ENV_FILE"; then
  sed -i.bak 's|^SDP_DB_HOST_PORT=.*|SDP_DB_HOST_PORT=5434|' "$ENV_FILE"
else
  echo 'SDP_DB_HOST_PORT=5434' >> "$ENV_FILE"
fi

rm -f "$ENV_FILE.bak"
echo "OK. Mapa:"
echo "  SDP UI:     http://localhost:3020"
echo "  SDP API:    http://localhost:8001"
echo "  Demo wallet:http://localhost:4000"
echo "  Orilla app: http://localhost:3030"
echo ""
echo "Relanzar stack:"
echo "  cd $ROOT/infra/stellar-disbursement-platform-backend/dev"
echo "  docker compose -p sdp-orilla-local --env-file $(basename "$ENV_FILE") -f docker-compose.yml up -d --build"
