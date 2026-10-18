# Orilla — plan app real (Semana 4+)

## 1. Aclaración: tres formas de “pagar en Stellar” (no son lo mismo)

| Camino | Qué es | Cuándo usarlo |
|---|---|---|
| **A · Pago clásico testnet** | Una operación `Payment` con el JS SDK / Horizon (mandar XLM o USDC de una cuenta a otra). | Demo rápida de “hubo tx real”. **No** es SDP. |
| **B · Soroban** | Smart contract en Rust (escrow, reglas on-chain, etc.). | Cuando la lógica de negocio debe vivir en el contrato. **No** es el camino principal del Blueprint. |
| **C · SDP (Stellar Disbursement Platform)** | Plataforma oficial de **dispersión masiva**: lista de receivers → pagos batch → wallets. | **Nuestro camino de producto** (opción B del Blueprint). |

En el Challenge #4 yo mencioné A/B como atajos para el video de 60s.  
**Para el aplicativo de verdad vamos por C (SDP)**, con API Orilla en el medio.  
A o B solo como apoyo si hace falta una prueba on-chain antes de tener SDP arriba.

Guía oficial SDP (local):  
https://developers.stellar.org/docs/platforms/stellar-disbursement-platform/admin-guide/getting-started

---

## 2. Qué vamos a construir (capas)

```text
[ Front Orilla — Next.js actual ]
        │  auth email (mock → real)
        ▼
[ API Orilla — Route Handlers /api/* ]
        │  lotes, receptores, estados, donaciones%
        ▼
[ SDP local (Docker) ] ──▶ Red Stellar testnet
        │
        ▼
[ Worker UI ] “Te pagaron” + hash real + off-ramp mock Bancolombia
```

Donaciones % = **fase después** de que un lote fijo ya salga por SDP (cálculo off-chain → mismos receivers).

---

## 3. Fases de trabajo

| Fase | Entrega | Criterio “listo” |
|---|---|---|
| **0 · Esqueleto** | Tipos de dominio, API stub, auth email mock, docs | Front llama `/api/*` en vez de solo `mock.ts` |
| **1 · Auth mock** | Login pagador por correo + cookie de sesión | Sin password real; OTP/código fijo en dev |
| **2 · API de lotes** | CRUD lotes/receptores en memoria o SQLite | Cerrar noche cambia estado en API |
| **3 · SDP local** | Clone + wizard Docker SDP; un disbursement de prueba | Pago visible en demo wallet / explorer |
| **4 · Cable Orilla→SDP** | API crea disbursement al “cerrar lote” | Comprobante con tx/hash no mock |
| **5 · Donaciones %** | Evaluar + mock→API de pool % | Solo si fase 4 estable |
| **6 · Video reto** | POV 60s sobre flujo real | Cumple checklist Challenge #4 |

---

## 4. Recursos que ya tenemos

- Stellar CLI `28.0.0`
- Rust `1.98`
- Docker + Compose
- Front Next 16 en `frontend/` (flujos pagador + cobrar)
- Raven / docs oficiales SDP + skill dapp (`@stellar/stellar-sdk`)
- Demo deploy: https://orilla-dusky.vercel.app

---

## 5. Decisiones pendientes (preguntas al equipo)

Ver sección “Preguntas” en el chat. Hasta responder, asumimos defaults seguros:

- API dentro del mismo Next.js (`frontend/src/app/api`) — menos repos.
- Auth email mock con cookie httpOnly + código fijo `4821` (como el OTP staff).
- Persistencia fase 2: JSON/SQLite local; luego Postgres si hace falta.
- SDP: instancia **local Docker** (no mainnet).

## 6. Avance (bitácora)

| Fecha | Qué se hizo |
|---|---|
| 2026-10-14 | Docs arquitectura + SDP-setup. Dominio `lib/domain`, store memoria, API `auth/*` + `lotes/*`, login pagador cableado a `/api/auth/login`. |
| 2026-10-14 | Postgres Docker `:5433` + Prisma 6 + seed. API lotes/auth leen DB. SDP clonado en `infra/`. Doc wallets/donaciones. Orilla en puerto **3001**. |
