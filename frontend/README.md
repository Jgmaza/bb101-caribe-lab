# Orilla — frontend

Un grupo (banda, staff de evento) define una vez el % de cada integrante. El
organizador hace **un solo pago** a la cuenta del proyecto y Orilla lo reparte
al instante en **Stellar testnet**, con comprobante para todos.

## Requisitos

- Node.js 20 o superior, npm 10 o superior
- Un proyecto de [Supabase](https://supabase.com) (el tier gratis alcanza)

## Instalación

```bash
cd frontend
npm install
cp .env.example .env.local
```

### 1. Cuentas en Stellar testnet

```bash
npm run stellar:setup
```

Crea con friendbot la cuenta *issuer* del activo de prueba `COP`, la cuenta
*funder* (paga el XLM de cada cuenta custodial) y el *organizador demo* con
20.000.000 COP de prueba. También genera `ORILLA_ENCRYPTION_KEY`. Copia las
líneas que imprime en `.env.local`.

> Si cambias `ORILLA_ENCRYPTION_KEY`, las cuentas ya creadas quedan inaccesibles.

### 2. Base de datos

Completa `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `DATABASE_URL` en
`.env.local` y aplica el esquema:

```bash
npm run db:apply
```

Todo el modelo (tablas, restricciones, triggers, RLS y funciones) vive en
[`../supabase/schema.sql`](../supabase/schema.sql). Es idempotente: se puede
volver a aplicar, o pegar en el SQL editor de Supabase. **No configures nada a
mano en el dashboard**: cualquier cambio de esquema va en ese archivo.

## Cómo correrlo

```bash
npm run dev     # http://localhost:3000
npm test        # pruebas del reparto porcentual
npm run lint
npm run build && npm start
```

## Recorridos

| Quién | Ruta | Qué hace |
|---|---|---|
| Grupo | `/proyectos/nuevo` | Crea el proyecto con integrantes y % (deben sumar 100%) |
| Grupo | `/panel/[token]` | Panel de administración (link secreto): link de pago, links de cobro, pagos, editar % |
| Organizador | `/pagar/[slug]` | Paga un total; se reparte al instante |
| Integrante | `/cobrar/[id]` | Link que le comparte el grupo; OTP de prueba `4821`, ve saldo e historial |

## Acceso sin login (MVP)

No hay usuarios ni contraseñas; cada link da acceso solo a lo suyo:

- **`/panel/<token>`**: administra el proyecto. El token (32 bytes aleatorios) se
  muestra al crear el proyecto y solo se guarda su sha256: si se pierde, no se
  recupera. Se comparte solo dentro del grupo.
- **`/pagar/<slug>`**: público; solo permite pagar. No sirve para administrar.
- **`/cobrar/<uuid>`**: lo que cobró un integrante.

## Cómo funciona

1. Al crear un proyecto, una sola transacción Stellar crea la cuenta custodial
   del proyecto y la de cada integrante (con trustline a `COP`). Las claves se
   guardan cifradas con AES-256-GCM.
2. El organizador paga a la cuenta del proyecto.
3. Orilla reparte con **una transacción de N pagos** (todo o nada). Los montos
   se calculan en `src/lib/split.ts` (mayor residuo: suman exactamente el total).
   Si el reparto falla, el pago queda en `failed` y se puede reintentar desde el
   panel del proyecto.

El reparto está aislado en `distribute()` (`src/lib/server/stellar.ts`) para
poder cambiarlo por la API de SDP más adelante.

## Fuera del MVP (v2)

Auth real (hoy el acceso es por links), SMS real, cash-out a
Bancolombia, pago por adelantado (escrow), entrada de pesos reales, mainnet.
