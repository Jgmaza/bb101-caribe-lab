# Wallets y cuentas — Orilla + SDP (+ donaciones después)

## Respuesta corta a tu pregunta

Sí: la empresa (hotel / Carnaval / productora) opera con una **cuenta de distribución en Stellar** (distribution account).  
Esa cuenta es la que **tiene el saldo** y desde la cual **SDP envía** los pagos masivos.

- **No** es la wallet personal del músico.
- **No** vive la secret key en el front de Next.
- SDP (y su TSS) administra el envío; Orilla decide *a quién* y *cuánto*.

Para donaciones más adelante: primero se **recauda** en una cuenta/pool (o contrato), y cuando el evento “cierra”, esos fondos alimentan (o ya están en) la misma distribution account → SDP dispersa por % calculado en Orilla.

---

## Cuentas que existen en el MVP (lote fijo)

```text
┌─────────────────────────────────────────────────────────┐
│  Organización (pagador)                                 │
│                                                         │
│  Distribution Account (Stellar)  ◀── fondeada (USDC/XLM)│
│         │                                               │
│         │  SDP crea disbursement + pagos                 │
│         ▼                                               │
│  Receiver wallets (músicos / staff)                     │
│         │                                               │
│         ▼                                               │
│  Off-ramp mock → “Bancolombia” (UX)                     │
└─────────────────────────────────────────────────────────┘

Separada (SDP):
  SEP-10 Signing Account  → auth de wallets / SEP flows
```

Docs SDP (deploy): hace falta **Distribution Account (funded)** + **SEP-10 Signing Account**.  
En local, el wizard `make setup` **genera y fondea** esas cuentas en testnet.

---

## Flujo donaciones % (fase posterior — tu idea)

```text
1. Donantes pagan → Pool Account  (o escrow Soroban)
2. Orilla calcula montos por % (off-chain, regla de negocio)
3. Si hubo contrato: release → fondos a Distribution Account
4. SDP disbursement desde Distribution Account → beneficiarios
```

### ¿Hace falta smart contract?

| Enfoque | Recaudación | Dispersión | Complejidad |
|---|---|---|---|
| **A · Solo cuentas** | Pool account clásica (Stellar asset) | SDP desde distribution (puede ser la misma pool o transferir a ella) | Baja — recomendado primero |
| **B · Escrow Soroban** | Contrato congela / reglas on-chain | Al liberar → distribution → SDP | Alta — cuando necesiten confianza “nadie mueve el pool a mano” |

**Administrar la cuenta:**  
- Keys de distribution/pool: secretos de servidor / SDP (nunca en el browser).  
- Orilla API: “cerrar pool” → (opcional) move funds → crear disbursement SDP.  
- El “wallet de la empresa” **es** esa distribution account (+ usuarios admin en SDP/Orilla con email).

---

## Qué NO mezclar

| Cosa | Rol |
|---|---|
| Cuenta distribution | Tesorería on-chain del pagador |
| Wallet del músico | Recibe el pago (Demo Wallet en local; luego wallet real SDP-ready) |
| Auth email Orilla | Quién opera el panel (off-chain) |
| Contrato Soroban | Solo si quieren reglas de custodia; no reemplaza SDP |

---

## Implicación práctica esta semana

1. Levantamos SDP local → el wizard crea distribution account testnet.  
2. Orilla (Postgres + API) guarda lotes y, en Fase 4, llama a SDP para pagar desde esa cuenta.  
3. Donaciones / contrato: diseño arriba; **código después** de un disbursement fijo exitoso.
