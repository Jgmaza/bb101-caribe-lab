# Plan — Orilla 100% funcional en Stellar testnet

**Estado:** aprobado el 2026-10-18 · pendiente de implementar
**Punto de partida:** `main` en `2f7a40c` + fixes de hover (ya en `main`)

## Contexto

Hoy Orilla funciona en testnet de punta a punta, pero con atajos de demo:

- El pagador es **una cuenta "organizador demo" compartida** (env `ORGANIZER_DEMO_SECRET`) que paga en un token `COP` emitido por nosotros.
- No hay usuarios: el grupo administra por un **link secreto** (`/panel/<token>`) y cada integrante ve su saldo por `/cobrar/<uuid>` con un OTP decorativo (`4821`).
- Hay **una wallet por integrante *por proyecto*** (quien está en dos bandas tiene dos wallets).
- **Nadie puede retirar**: el token `COP` no existe fuera de Orilla y "Enviar a Bancolombia" es una pantalla de "próximamente".

Objetivo: que personas reales puedan registrarse, recargar, pagar a un grupo, ver lo que les pagaron y retirar, todo sobre testnet y sin términos técnicos (nada de "wallet", "XLM", "friendbot" en la UI).

## Decisiones (y por qué)

| Decisión | Motivo |
|---|---|
| **Pagos en XLM, valores en pantalla en COP** | Friendbot entrega XLM: sin tesorería, sin conseguir USDC, sin trustlines. El usuario ve pesos. |
| **Tasa XLM→COP de CoinGecko** (`/api/v3/simple/price?ids=stellar&vs_currencies=cop`) con caché de ~60 s; **la tasa se congela en cada pago, recarga y retiro** | Gratis y sin key (key "demo" opcional vía `COINGECKO_API_KEY`). Congelar la tasa hace que recibos e historial no cambien con el precio. Es el precio de mainnet: en testnet solo sirve de referencia. Los saldos actuales se muestran como "≈ $ … hoy". |
| **"Recargar saldo" = friendbot por debajo** | Friendbot solo fondea cuentas **que no existen**. Para recargar varias veces: crear una cuenta temporal, fondearla con friendbot y fusionarla (`accountMerge`) en la del usuario (~10.000 XLM por recarga). |
| **"Recargar desde mi banco" visible pero deshabilitado** | Lo implementa el equipo después (anchor SEP-24 en modo depósito). |
| **Recarga automática al pagar** | Si el saldo no alcanza, se recarga lo necesario y se paga en un solo paso; para el usuario es solo "Pagar". |
| **Retiro: a otra wallet Stellar y "a mi banco (prueba)" vía anchor SEP-24** (`testanchor.stellar.org`, `native` habilitado para retiro, verificado) | Deja lista la integración (SEP-10 + SEP-24 + seguimiento del estado); para Bancolombia en el futuro solo cambia el anchor. |
| **Usuario + contraseña, hash bcrypt (costo 12), sin recuperar contraseña** | Sin email ni SMS ni configuración del dashboard de Supabase. Tabla de usuarios propia (no Supabase Auth) para que todo viva en `schema.sql`. |
| **Sesiones en tabla propia** (cookie `httpOnly` + `Secure` + `SameSite=Lax` con un token aleatorio; en la DB solo su sha256) | Permite cerrar sesión e invalidar sesiones; no requiere secreto extra. |
| **`username` único como identificador** (`^[a-z0-9_]{3,20}$`, en minúsculas) | Los admins agregan integrantes por `@usuario`. |
| **Solo usuarios registrados pueden ser integrantes** | Cada pago llega a una wallet con dueño; no hay invitaciones pendientes. |
| **Una wallet custodial por persona** (creada al registrarse) | Un solo saldo, aunque esté en varios proyectos. |
| **Se mantiene la cuenta del proyecto** (recibe el pago y reparte en una transacción de N pagos) | Ya está probado; deja en la red el registro "se le pagó al grupo". `distribute()` sigue aislada. |
| **Admins de proyecto con login**: quien crea el proyecto es integrante y admin; puede nombrar otros admins. Solo admins editan. Historial de cambios visible para los integrantes | Reemplaza al link secreto, que cualquiera con el link podía usar sin dejar rastro. |
| **Reinicio de datos de prueba** | El modelo cambia demasiado (usuarios, XLM). |

### Cambiar una contraseña a mano (demo)

En el SQL editor de Supabase (`pgcrypto` ya está activo; genera `$2a$` que `bcryptjs` verifica):

```sql
update public.users
set password_hash = crypt('NuevaClave123', gen_salt('bf', 12))
where username = 'laura';
```

Documentarlo también en `frontend/README.md`.

## Modelo de datos (`supabase/schema.sql`)

Reglas que siguen vigentes: todo en SQL versionado e idempotente, sin pasos en el dashboard, RLS activo **sin policies públicas**, solo `service_role` accede (el servidor de Next valida la sesión en cada página y acción).

Reinicio: agregar `supabase/reset.sql` (borra todos los objetos de Orilla) y un script `npm run db:reset` que exija confirmación explícita (p. ej. `-- --yes`). `schema.sql` sigue siendo idempotente.

| Tabla | Campos clave | Invariantes |
|---|---|---|
| `users` | `username` (único, regex), `display_name`, `password_hash`, `stellar_public_key` (único), `stellar_secret_enc` | — |
| `sessions` | `user_id`, `token_hash` (único), `expires_at` | expiración (p. ej. 30 días) |
| `projects` | `slug`, `name`, `kind`, `stellar_public_key`, `stellar_secret_enc`, `created_by` | al menos un integrante y al menos un admin (triggers diferidos) |
| `project_members` | `project_id`, `user_id`, `role`, `share_bps`, `is_admin` | `unique(project_id, user_id)`; suma de `share_bps` = 10000 (trigger diferido, ya existe) |
| `share_changes` | `project_id`, `changed_by`, `before` jsonb, `after` jsonb | historial de cambios de % e integrantes |
| `payments` | `project_id`, `payer_id`, `amount_cop` (lo que escribió), `amount_stroops`, `cop_per_xlm` (tasa congelada), `status`, `topup_tx_hash`, `payment_tx_hash`, `distribution_tx_hash`, `error` | checks de estado como hoy |
| `distributions` | `payment_id`, `member_id`, `share_bps` (foto), `amount_stroops` | la suma = `payments.amount_stroops` (trigger, ya existe) |
| `topups` | `user_id`, `amount_stroops`, `cop_per_xlm`, `tx_hash`, `source` (`prueba` / `banco` en el futuro) | — |
| `withdrawals` | `user_id`, `kind` (`wallet` / `banco`), `destination`, `amount_stroops`, `cop_per_xlm`, `status`, `anchor_tx_id`, `stellar_tx_hash`, `error` | — |

RPC transaccionales como hoy: `create_project`, `update_project_members` (escribe también en `share_changes`), `record_distribution`.

## Stellar (`frontend/src/lib/server/stellar.ts`)

- **Quitar** el activo `COP`, el issuer y el organizador demo (`COP_ISSUER_SECRET`, `ORGANIZER_DEMO_SECRET`).
- **Montos en stroops** (1 XLM = 10.000.000). `splitAmount` debe pasar a **BigInt**: con stroops, `total * shareBps` supera 2^53 (hoy `MAX_AMOUNT` = 1e11).
- **Cuentas nuevas** (usuario o proyecto): las crea el funder con `createAccount` y lo justo para la reserva (~1,5 XLM). Si el funder baja de un umbral, se recarga solo con friendbot + `accountMerge`.
- **Saldo disponible** = balance − reserva mínima (1 XLM por cuenta base) − margen para comisiones. Mostrar siempre el disponible.
- **Recargar**: `Keypair.random()` → friendbot → `accountMerge` hacia el usuario (una transacción firmada por la temporal). Repetir hasta cubrir el monto pedido (tope razonable, p. ej. 5).
- **Pagar**: (recarga automática si falta) → pago del pagador a la cuenta del proyecto → `distribute()` en una transacción con N pagos (como hoy). Memo `orilla <8 primeros del id>`.
- **Retiro a wallet**: validar la dirección (`StrKey.isValidEd25519PublicKey`). Si la cuenta de destino no existe, usar `createAccount` en vez de `payment`. Permitir memo opcional (los exchanges lo piden).
- **Retiro vía anchor** (SEP-24, `ANCHOR_DOMAIN=testanchor.stellar.org`):
  1. Leer `stellar.toml` (`TRANSFER_SERVER_SEP0024`, `WEB_AUTH_ENDPOINT`, `SIGNING_KEY`).
  2. SEP-10: pedir el challenge para la cuenta del usuario, verificarlo (`WebAuth` del SDK; revisar dónde está en `@stellar/stellar-sdk` v17) y firmarlo con su clave custodial en el servidor → JWT.
  3. `POST /transactions/withdraw/interactive` con `asset_code=native` → abrir la URL interactiva (popup o iframe) para que el usuario llene los datos "bancarios" de prueba.
  4. Consultar `GET /transaction?id=` hasta `pending_user_transfer_start`; tomar `withdraw_anchor_account`, `withdraw_memo` (respetar `withdraw_memo_type`) y `amount_in`.
  5. Pedir confirmación en Orilla ("Vas a retirar ≈ $X a tu banco") y enviar el pago con el memo.
  6. Seguir el estado hasta `completed` / `error` y reflejarlo en `withdrawals`.
- **Red**: en esta máquina Node no alcanza `friendbot.stellar.org` por IPv6 (timeout). Fijar `dns.setDefaultResultOrder("ipv4first")` en `src/instrumentation.ts` (o en un módulo de servidor que se importe al inicio) y en los scripts.

## Pantallas y rutas

Sin jerga técnica: "saldo", "recargar", "retirar", "pagar", "proyecto". Las vistas de integrante son mobile-first (`MobileShell`); las de admin y pagador, desktop-first (`DesktopShell`). Reutilizar `src/components/ui.tsx`, `MembersEditor` (adaptarlo a `@usuario` en vez de celular) y `CopyLink`.

| Ruta | Quién | Qué |
|---|---|---|
| `/` | todos | Landing: "Crear cuenta" / "Ingresar" |
| `/registro`, `/ingresar`, salir (acción) | todos | usuario, nombre visible, contraseña (mín. 8). Al registrarse se crea la wallet |
| `/inicio` | logueado | Saldo disponible "≈ $ … hoy", **Recargar saldo**, **Recargar desde mi banco** (deshabilitado), **Retirar**, mis proyectos, historial unificado (cobros, pagos, recargas, retiros) con link al explorador |
| `/proyectos/nuevo` | logueado | nombre, tipo, integrantes por `@usuario` + rol + %; el creador entra como integrante y admin |
| `/proyectos/[slug]` | integrantes | %, integrantes, pagos y reparto, historial de cambios; link de pago para compartir |
| `/proyectos/[slug]/editar` | admins | %, roles, agregar/quitar integrantes, nombrar/quitar admins (siempre debe quedar uno) |
| `/pagar/[slug]` | logueado (si no, redirige a ingresar y vuelve) | monto en COP → vista previa en COP; aviso si se recargará la diferencia; recibo `/pagar/[slug]/recibo/[id]` |
| `/retirar` | logueado | elegir "A mi banco (prueba)" o "A otra wallet"; estado del retiro |

Eliminar: `/panel/[token]`, `/cobrar/*`, `admin_token_hash` y lo relacionado (`newAdminToken`, `getProjectByAdminToken`).

## Fases (commits separados, en español con conventional commits)

1. **Usuarios y sesiones**: `reset.sql`, `schema.sql` nuevo, `bcryptjs`, registro, ingreso, salida, wallet por persona, guardas de sesión en páginas y acciones.
2. **XLM y pesos**: `split` con BigInt en stroops, servicio de precio con caché y congelado, quitar el activo `COP`, recarga con friendbot + merge, saldo disponible.
3. **Proyectos con admins**: crear, ver y editar con `@usuario`, `share_changes`, permisos.
4. **Pagar**: recarga automática, pago, reparto, recibo; reintento de reparto solo para admins.
5. **Retiros**: a wallet y vía anchor SEP-24.
6. **Entorno real**: limpiar `.env.example`, README, variables en Vercel y recorrido completo en el despliegue.

## Verificación

- `npm test` (sumar casos de `split` con BigInt y montos grandes en stroops), `npm run lint`, `npm run build`.
- `npm run db:reset -- --yes` + `npm run db:apply` contra Supabase; probar por SQL que se rechazan: % que no suman 100, proyecto sin admin, integrante duplicado.
- E2E con Playwright MCP sobre `next build && next start -p 3124` (el usuario suele tener su `next dev` en el puerto 3000 y Next no permite un segundo dev server en la misma carpeta; no matarlo). Capturas en `.playwright-mcp/` (ignorado por git):
  1. registrar `bar_la_troja`, `laura`, `andres` y `pedro`;
  2. `laura` crea "Los Pescadores del Rock" con `@andres` 45% y `@pedro` 10% (ella 45%);
  3. `bar_la_troja` paga 1.000.000 COP **sin recargar antes** → la recarga automática debe ocurrir;
  4. verificar en Horizon las transacciones y que los stroops repartidos suman el pago;
  5. `pedro` intenta editar % → prohibido; `laura` lo nombra admin → ahora puede; el historial muestra quién cambió qué;
  6. `andres` retira a una wallet nueva (`Keypair.random()`) → la cuenta queda creada con el monto;
  7. `laura` retira "a mi banco (prueba)" por el anchor hasta `completed`;
  8. cambiar una contraseña con el SQL de arriba e ingresar con ella.

## Notas del entorno

- Leer `frontend/node_modules/next/dist/docs/` antes de escribir código de Next (Next 16 cambia APIs; ver `frontend/AGENTS.md`).
- `DATABASE_URL` usa el **Session pooler** de Supabase (la conexión directa es solo IPv6 y aquí no resuelve).
- En Windows, renombrar carpetas de `src/app` falla si el `next dev` del usuario está corriendo: mover archivos uno por uno con `git mv`.
- Variables actuales en `frontend/.env.local`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `STELLAR_HORIZON_URL`, `FUNDER_SECRET`, `ORILLA_ENCRYPTION_KEY` (no cambiarla: invalida las cuentas existentes), más `COP_ISSUER_SECRET` y `ORGANIZER_DEMO_SECRET` (dejan de usarse) y `RESEND_API_KEY` (ya no se usa).
