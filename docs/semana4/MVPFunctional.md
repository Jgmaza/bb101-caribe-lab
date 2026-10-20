# Entregable 4 — MVP Functional · Orilla

**Equipo:** bb101-caribe-lab (Caribe Lab)  
**Producto:** Orilla — *Que quien trabaja hoy, cobre hoy.*  
**Repositorio:** [Jgmaza/bb101-caribe-lab](https://github.com/Jgmaza/bb101-caribe-lab)  
**Deadline Apex:** 19 oct 2026, 23:00 COT  
**Estado MVP (19 oct noche):** **listo para entrega Apex** — empresa Excel → cerrar noche (USDC) → Te pagaron → banco de prueba.

**Arquitectura:** opción B (ecosistema). Pagos en **USDC** (Circle testnet) vía Horizon/SDK + wallets custodiales + ancla SEP-24 (`testanchor`, asset USDC). XLM solo para reservas/fees y fondeo (friendbot → swap DEX). SDP queda como motor de escala para lotes grandes (`disburseLote` es el punto de enchufe).

---

## ¿El MVP está listo?

**Sí, como MVP funcional de demo en testnet.** Una empresa sube Excel (`.xlsx`) o CSV, ve la interpretación (@usuario vs cuánto recibe), cierra la noche y cada trabajador con cuenta Orilla ve **Te pagaron** y puede **Pasar a mi banco** (ancla de prueba). Orilla crea y administra la cuenta Stellar: el usuario no maneja claves.

| Criterio | Estado |
|---|---|
| Auth username + sesión | ✅ |
| Wallet custodial al registrarse | ✅ |
| Empresa: lotes + Excel/CSV montos/% | ✅ |
| Interpretación usuario → recibe | ✅ |
| Cerrar la noche on-chain (USDC / Horizon) | ✅ |
| Te pagaron + comprobante | ✅ |
| Retiro banco prueba / otra cuenta | ✅ |
| Producto en Vercel | ✅ https://orilla-dusky.vercel.app |
| Tests automatizados del flujo | ✅ `npm test` (ver matriz) |
| SDP a escala / Bancolombia real | ⏸ post-MVP |

**Límites conscientes:** máx. ~40 filas por lote (Horizon); banco = `testanchor.stellar.org` (USDC 1–10); trustline USDC al crear cuenta / primer uso; jerga Stellar oculta en UI (Expert solo fuera de prod mode).

---

## Evidencia verificable

| Qué | Enlace |
|---|---|
| **Producto en línea** | https://orilla-dusky.vercel.app |
| **Video del MVP (≤3 min)** | https://www.youtube.com/watch?v=VIDEO_URL |
| **Excel demo (montos)** | https://orilla-dusky.vercel.app/Lote-pagos-Orilla-demo.xlsx |
| **Excel demo (%)** | https://orilla-dusky.vercel.app/Lote-pagos-Orilla-porcentajes.xlsx |
| **CSV espejo (montos)** | https://github.com/Jgmaza/bb101-caribe-lab/raw/main/frontend/public/plantilla-lote-caribe.csv |
| **Pago USDC testnet** | https://stellar.expert/explorer/testnet/tx/9a53c4ec028e4d97d90d486c4c10f5bb61c2df83516a40317359cb0413e6c115 |
| **Pago / reparto (proyectos %)** | https://stellar.expert/explorer/testnet/tx/28b1a1b88e1188f28ae8a75c08ad71eca22de0c0870feef80d1a29a160192ec3 |
| **Reparto (proyectos %)** | https://stellar.expert/explorer/testnet/tx/bd6cc1f86c3fc33a4dbdf1f8a6db84498a88e659bb68c939299e28f44c3d0e06 |

**Recorrido principal (demo):**  
empresa `/lotes/nuevo` (Excel) → interpretación → `/lotes/[id]` **Cerrar la noche** → trabajador `/inicio` **Te pagaron** → `/retirar`.

**Atajo grupos %:** `/proyectos` + `/pagar/[slug]`.

---

## Matriz de pruebas automatizadas (flujo MVP)

Ejecutar: `cd frontend && npm test`  
Suite dedicada: [`frontend/src/lib/mvp-flow.test.ts`](../../frontend/src/lib/mvp-flow.test.ts) (+ `excel`, `roles`, `auth`, `payments`, `withdrawals`, `split`, `money`).

**Resultado 19 oct 2026:** **56 tests, 56 pass, 0 fail.**

| # | Eslabón del flujo | Qué se prueba | Archivo / tests |
|---|---|---|---|
| 1 | Registro / identidad | username, password, displayName, `safeNext` | `mvp-flow` · `auth.test` |
| 2 | Excel → lote (montos) | Plantilla Caribe: 5 usuarios, columnas, montos | `mvp-flow` · `excel.test` |
| 3 | Excel → lote (%) | % suman 100 + total obligatorio | `mvp-flow` |
| 4 | Límite escala MVP | Rechazo > 40 filas (Horizon) | `mvp-flow` |
| 5 | Roles de evento | Alias músico/staff/sonido/… | `mvp-flow` · `roles.test` |
| 6 | Cerrar noche (montos) | COP → unidades on-chain y vuelta con tasa | `mvp-flow` · `money.test` |
| 7 | Cerrar noche (%) | `splitAmount` exacto | `mvp-flow` · `split.test` |
| 8 | Recarga si falta saldo | `topUpShortfall` | `mvp-flow` · `payments.test` |
| 9 | Te pagaron / estados | `paymentPhase`, reintento admin | `mvp-flow` · `payments.test` |
| 10 | Pasar a banco / wallet | destino válido, SEP-24 transitions | `mvp-flow` · `withdrawals.test` |
| 11 | Grupos % (atajo) | `parseMembers`, admins, historial | `members.test` |

---

## Aprendizajes y ajustes priorizados

Aprendimos que el mock del E3 no basta: hace falta tx real y un recorrido de empresa creíble. SDP completo (Demo Wallet, claim) es el camino de escala pero frágil para el deadline; el MVP usa Horizon detrás de `disburseLote` y Excel como puerta del hotel. Las wallets custodiales permiten que el usuario no sepa que usa Stellar. Pasar de XLM a USDC alineó el pitch de “stablecoin / cobro hoy” con el activo que el ancla de prueba también entiende.

Ajustes hechos: (1) auth + custodial; (2) lotes Excel montos/% + interpretación en vivo; (3) cerrar noche en USDC; (4) Te pagaron + retiro SEP-24 USDC; (5) Vercel al día; (6) tests del flujo. Pendiente post-demo: SDP a escala, Bancolombia real, validación con usuarios reales del Problem Brief.

*(≈190 palabras)*

---

## Riesgos y pendientes

**Técnicos.** Rotar `ORILLA_ENCRYPTION_KEY` invalida todas las wallets custodiales cifradas. Friendbot, el DEX de testnet (swap XLM→USDC) y Horizon pueden fallar o ir lentos; el cierre de noche depende de liquidez y de trustlines. La tasa USDC→COP es referencia de CoinGecko, no un oracle on-chain. El ancla `testanchor` acepta USDC entre 1 y 10 unidades: montos de demo deben caber ahí para el retiro a “banco”. Lotes de más de ~40 filas no caben en una sola tx Horizon; ahí entra SDP. Cuentas seed antiguas abren trustline USDC en el primer uso (pago, recarga o cierre).

**Producto.** El copy debe seguir ocultando jerga crypto; Expert solo fuera de prod mode. Deploy en Vercel a veces rechaza commits de autores no colaboradores (workaround: deploy CLI). El video de demostración debe permanecer en una URL pública estable para evaluación.

**Pendientes.** Publicación del video en plataforma pública; Challenge #4 en redes (bono); capturas actualizadas al flujo `/lotes`; validación con usuarios reales.

*(≈210 palabras)*

---

## Plan de validación con usuarios

**A quiénes.** Músicos/staff de eventos Caribe + tesorería de hotel/productora (Problem Brief).

**Métodos.** (1) Prueba moderada 20–30 min: empresa sube el Excel demo, revisa interpretación, cierra noche; trabajador ve Te pagaron y prueba retiro. (2) Entrevista corta post-uso (confianza, claridad “saldo” vs banco). (3) Métrica: tiempo desde “Cerrar la noche” hasta Te pagaron &lt; 60 s en red normal.

**Hipótesis.** H1: el trabajador entiende Te pagaron sin jerga. H2: la empresa prefiere su Excel de siempre. H3: el comprobante aumenta confianza aunque el banco sea sandbox.

**Éxito.** ≥4/5 completan happy path; ≥3/5 cobrarían “esta noche” si el banco fuera real; Excel sin errores de %/montos en el primer intento guiado.

*(≈200 palabras)*

---

## Mapa técnico

| Pieza | Dónde |
|---|---|
| Lotes + Excel/CSV | `frontend/src/app/lotes/*`, `lib/excel.ts`, `LoteInterpretacion.tsx` |
| Cerrar noche | `lib/server/disburse.ts` → `payMany` USDC (Horizon; mañana SDP) |
| USDC / custodial | `lib/server/stellar.ts`, `auth-actions.ts`, `session.ts` |
| Schema | `supabase/schema.sql` (`lotes`, `lote_items`) |
| Seed demo | `npm run seed:demo` |
| Plantillas | `frontend/public/Lote-pagos-Orilla-demo.xlsx` |
| Tests flujo | `src/lib/mvp-flow.test.ts` |

---

*Caribe Lab · Semana 4 · Blockchain Builders 101*
