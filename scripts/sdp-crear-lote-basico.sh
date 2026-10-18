#!/usr/bin/env bash
# Crea un disbursement en SDP local con el CSV de Orilla (cédula = id).
# Prerrequisito: SDP arriba en :8001 y tenant default.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CSV="$ROOT/../Entregables/Entregable 4/docs/local/lote-dann-lobby.csv"
# Fallback si se corre desde otra ruta
if [[ ! -f "$CSV" ]]; then
  CSV="/Users/jgmaza/Documents/Proyectos/Stellar/Ruta N Builders 101/Entregables/Entregable 4/docs/local/lote-dann-lobby.csv"
fi
API="${SDP_API:-http://localhost:8001}"
EMAIL="${SDP_OWNER_EMAIL:-owner@default.local}"
PASS="${SDP_OWNER_PASS:-Password123!}"

echo "==> Login SDP ($EMAIL)"
TOKEN=$(curl -s -X POST "$API/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

ASSET_XLM=$(curl -s "$API/assets" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; print(next(a['id'] for a in json.load(sys.stdin) if a['code']=='XLM'))")
WALLET=$(curl -s "$API/wallets" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; print(next(w['id'] for w in json.load(sys.stdin) if w.get('name')=='Demo Wallet'))")

NAME="orilla-dann-lobby-$(date +%Y%m%d-%H%M%S)"
echo "==> POST disbursement name=$NAME asset=XLM wallet=Demo"

DISB=$(curl -s -X POST "$API/disbursements" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"$NAME\",\"asset_id\":\"$ASSET_XLM\",\"wallet_id\":\"$WALLET\",\"registration_contact_type\":\"PHONE_NUMBER\",\"verification_field\":\"DATE_OF_BIRTH\"}")

echo "$DISB" | python3 -m json.tool | head -40
DISB_ID=$(echo "$DISB" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id') or '')")
if [[ -z "$DISB_ID" ]]; then
  echo "ERROR: no se creó el disbursement"
  exit 1
fi

echo "==> Upload instructions $CSV"
curl -s -X POST "$API/disbursements/$DISB_ID/instructions" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@${CSV};type=text/csv" | python3 -m json.tool | head -50

echo "==> Start disbursement (READY → receivers can claim)"
curl -s -X PATCH "$API/disbursements/$DISB_ID/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"status":"STARTED"}' | python3 -m json.tool | head -40

echo ""
echo "OK disbursement_id=$DISB_ID"
echo "Dashboard: http://localhost:3020"
echo "Demo wallet: http://localhost:4000"
echo "CSV phones + cédulas: $CSV"
echo "Al registrar en demo wallet: phone del CSV + DOB (verification) + OTP en logs sdp-api"
