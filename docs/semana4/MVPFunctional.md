# Entregable 4 — MVP Functional · Orilla

**Equipo:** bb101-caribe-lab (Caribe Lab)  
**Producto:** Orilla — *Que quien trabaja hoy, cobre hoy.*  
**Repositorio:** [Jgmaza/bb101-caribe-lab](https://github.com/Jgmaza/bb101-caribe-lab)  
**Deadline Apex:** 19 oct 2026, 23:00 COT  
**Estado MVP (19 oct noche):** **listo para demo / Apex** en el recorrido empresa→lote→Te pagaron→banco de prueba. Límites abajo.

**Arquitectura:** opción B (ecosistema). Pagos nativos Horizon/SDK + wallets custodiales + ancla SEP-24 de prueba. SDP queda como motor de escala para lotes grandes (`disburseLote` es el punto de enchufe).

---

## ¿El MVP está listo?

**Sí, como MVP funcional de demo en testnet.** Una empresa puede subir un CSV (Excel → CSV), cerrar la noche y cada trabajador con cuenta Orilla ve **Te pagaron** y puede **Pasar a mi banco** (ancla de prueba). Al registrarse, Orilla crea y administra la cuenta Stellar: el usuario no maneja claves.

| Criterio | Estado |
|---|---|
| Auth username + sesión | ✅ |
| Wallet custodial al registrarse | ✅ |
| Empresa: lotes + CSV montos/% | ✅ |
| Cerrar la noche on-chain (Horizon) | ✅ |
| Te pagaron + comprobante | ✅ |
| Retiro banco prueba / otra cuenta | ✅ |
| Producto en Vercel | ✅ https://orilla-dusky.vercel.app |
| Tests automatizados del flujo | ✅ `npm test` (ver matriz) |
| SDP a escala / Bancolombia real / XLSX nativo | ⏸ post-MVP |

**Límites conscientes:** CSV (no `.xlsx` binario); máx. ~40 filas por lote; banco = `testanchor.stellar.org`; jerga Stellar oculta en UI (Expert solo fuera de prod mode).

---

## Evidencia verificable

| Qué | Enlace |
|---|---|
| **Producto en línea** | https://orilla-dusky.vercel.app |
| **Video del MVP (≤3 min)** | https://github.com/Jgmaza/bb101-caribe-lab/raw/main/docs/semana4/video-mvp-orilla.mp4 |
| **Plantilla CSV montos** | https://github.com/Jgmaza/bb101-caribe-lab/raw/main/frontend/public/plantilla-lote-caribe.csv |
| **Pago / reparto testnet (proyecto %)** | https://stellar.expert/explorer/testnet/tx/28b1a1b88e1188f28ae8a75c08ad71eca22de0c0870feef80d1a29a160192ec3 |
| **Reparto** | https://stellar.expert/explorer/testnet/tx/bd6cc1f86c3fc33a4dbdf1f8a6db84498a88e659bb68c939299e28f44c3d0e06 |

**Recorrido principal (demo):**  
`/registro` o usuarios seed → empresa `/lotes/nuevo` (CSV) → `/lotes/[id]` **Cerrar la noche** → trabajador `/inicio` **Te pagaron** → `/retirar`.

**Atajo grupos %:** `/proyectos` + `/pagar/[slug]`.

---

## Matriz de pruebas automatizadas (flujo MVP)

Ejecutar: `cd frontend && npm test`  
Suite dedicada: [`frontend/src/lib/mvp-flow.test.ts`](../../frontend/src/lib/mvp-flow.test.ts) (+ `excel`, `roles`, `auth`, `payments`, `withdrawals`, `split`, `money`).

**Resultado 19 oct 2026:** **56 tests, 56 pass, 0 fail.**

| # | Eslabón del flujo | Qué se prueba | Archivo / tests |
|---|---|---|---|
| 1 | Registro / identidad | username, password, displayName, `safeNext` a `/lotes` o `/inicio` | `mvp-flow` · `auth.test` |
| 2 | Excel → lote (montos) | Plantilla Caribe: columnas, montos, validación OK | `mvp-flow` · `excel.test` |
| 3 | Excel → lote (%) | % suman 100 + total obligatorio | `mvp-flow` |
| 4 | Límite escala MVP | Rechazo > 40 filas (Horizon) | `mvp-flow` |
| 5 | Roles de evento | Alias músico/staff/sonido/… | `mvp-flow` · `roles.test` |
| 6 | Cerrar noche (montos) | COP → stroops y vuelta con tasa | `mvp-flow` · `money.test` |
| 7 | Cerrar noche (%) | `splitAmount` exacto | `mvp-flow` · `split.test` |
| 8 | Recarga si falta saldo | `topUpShortfall` | `mvp-flow` · `payments.test` |
| 9 | Te pagaron / estados | `paymentPhase`, reintento admin | `mvp-flow` · `payments.test` |
| 10 | Pasar a banco / wallet | destino válido, SEP-24 transitions | `mvp-flow` · `withdrawals.test` |
| 11 | Grupos % (atajo) | `parseMembers`, admins, historial | `members.test` |

Pruebas **manuales** recomendadas (testnet): seed `npm run seed:demo` → login `danncarlton` / `OrillaHotel2026!` → subir plantilla → cerrar noche → login `laura` / `OrillaStaff2026!` → Te pagaron → retiro banco prueba.

Credenciales demo (no en repo público de evaluadores si se prefiere): ver carpeta local del equipo `Entregables/Entregable 4/docs/local/Usuarios.md`.

---

## Aprendizajes y ajustes priorizados

Aprendimos que el mock del E3 no basta: hace falta tx real y un recorrido de empresa creíble. SDP completo (Demo Wallet, claim) es el camino de escala pero frágil para el deadline; el MVP usa Horizon detrás de `disburseLote` y Excel/CSV como puerta del hotel. Las wallets custodiales permiten que el usuario no sepa que usa Stellar.

Ajustes hechos: (1) auth + custodial; (2) lotes Excel montos/%; (3) cerrar noche; (4) Te pagaron + retiro; (5) Vercel al día; (6) tests del flujo. Pendiente post-demo: SDP, Bancolombia real, XLSX nativo, validación con usuarios reales.

*(≈180 palabras)*

---

## Riesgos y pendientes

**Técnicos.** Rotar `ORILLA_ENCRYPTION_KEY` invalida wallets. Friendbot/Horizon pueden fallar por red. Tasa COP es referencia. Ancla de prueba ≠ Bancolombia. Lotes > 40 filas requieren SDP.

**Producto.** Copy debe seguir ocultando crypto. Deploy Vercel a veces bloquea por autor de commit (workaround: deploy CLI).

**Pendientes.** Challenge #4 IG ≤60s; commits de todos los integrantes; Apex; capturas actualizadas al flujo `/lotes`.

*(≈120 palabras — dentro del espíritu de la rúbrica; ampliar en Apex si piden 200–400)*

---

## Plan de validación con usuarios

**A quiénes.** Músicos/staff de eventos Caribe + tesorería de hotel/productora (Problem Brief).

**Métodos.** (1) Prueba moderada 20–30 min: empresa sube CSV, cierra noche; trabajador ve Te pagaron y prueba retiro. (2) Entrevista corta post-uso (confianza, claridad “saldo” vs banco). (3) Métrica: tiempo desde “Cerrar la noche” hasta Te pagaron &lt; 60 s en red normal.

**Hipótesis.** H1: el trabajador entiende Te pagaron sin jerga. H2: la empresa prefiere su Excel de siempre. H3: el comprobante aumenta confianza aunque el banco sea sandbox.

**Éxito.** ≥4/5 completan happy path; ≥3/5 cobrarían “esta noche” si el banco fuera real; CSV sin errores de %/montos en el primer intento guiado.

*(≈200 palabras)*

---

## Mapa técnico

| Pieza | Dónde |
|---|---|
| Lotes + CSV | `frontend/src/app/lotes/*`, `lib/excel.ts`, `lib/server/lote-actions.ts` |
| Cerrar noche | `lib/server/disburse.ts` → `payMany` (Horizon; mañana SDP) |
| Custodial / auth | `auth-actions.ts`, `session.ts`, `stellar.ts` |
| Schema | `supabase/schema.sql` (`lotes`, `lote_items`) |
| Seed demo | `npm run seed:demo` |
| Tests flujo | `src/lib/mvp-flow.test.ts` |

---

*Caribe Lab · Semana 4 · Blockchain Builders 101*
