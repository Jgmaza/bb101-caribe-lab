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
| Todos | `/registro`, `/ingresar` | Cuenta con usuario y contraseña; al registrarse se crea su wallet |
| Logueado | `/inicio` | Saldo, recargar, mis proyectos |
| Logueado | `/proyectos/nuevo` | Crea el proyecto con integrantes por `@usuario` y % (deben sumar 100%); quien lo crea queda como admin |
| Integrantes | `/proyectos/[slug]` | %, integrantes, pagos y reparto, historial de cambios, link de pago |
| Admins | `/proyectos/[slug]/editar` | %, roles, agregar/quitar integrantes, nombrar/quitar admins (siempre queda uno) |
| Logueado | `/pagar/[slug]` | Paga un total; se reparte al instante |

## Permisos

- Solo usuarios registrados pueden ser integrantes; el reparto llega a la wallet
  de cada uno (una por persona, aunque esté en varios proyectos).
- Quien no es integrante recibe 404 en las páginas del proyecto.
- Solo los admins editan el proyecto y reintentan repartos. Cada cambio queda en
  `share_changes` (antes/después) y lo ven todos los integrantes.
- `/pagar/<slug>` solo permite pagar; no sirve para administrar.

## Cómo funciona

1. Al crear un proyecto, Orilla crea su cuenta custodial en Stellar. Las claves
   se guardan cifradas con AES-256-GCM.
2. Quien paga envía XLM (en pantalla, pesos) a la cuenta del proyecto.
3. Orilla reparte con **una transacción de N pagos** (todo o nada) a la wallet
   de cada integrante. Los montos se calculan en `src/lib/split.ts` (mayor
   residuo: suman exactamente el total). Si el reparto falla, el pago queda en
   `failed` y un admin lo puede reintentar desde la página del proyecto.

El reparto está aislado en `distribute()` (`src/lib/server/stellar.ts`) para
poder cambiarlo por la API de SDP más adelante.

## Fuera del MVP (v2)

Auth real (hoy el acceso es por links), SMS real, cash-out a
Bancolombia, pago por adelantado (escrow), entrada de pesos reales, mainnet.
