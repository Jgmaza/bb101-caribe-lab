# Product Blueprint

**Nombre del proyecto:** Orilla

**Repositorio (enlace obligatorio):** [bb101-caribe-lab](https://github.com/Jgmaza/bb101-caribe-lab)

> Tagline: *Que quien trabaja hoy, cobre hoy.*  
> Problem Brief: [`../semana1/ProblemBrief.md`](../semana1/ProblemBrief.md) · MVP: [`../producto/Orilla-MVP.md`](../producto/Orilla-MVP.md)

---

## Contenido

1. Priorización de historias
2. Propuesta de valor
3. Flujo de usuario
4. Alcance del MVP
5. Lean Canvas
6. Backlog priorizado (Kanban)
7. Arquitectura inicial
8. Uso de Stellar y justificación

---

## 1. Priorización de historias

> Historias elegidas entre las que propuso el equipo y criterio con que se priorizaron. Son las que pasan al backlog.

**Criterio de priorización:** imprescindibles para el happy path del MVP (pagador lanza lote → trabajador ve pago → cash-out a Bancolombia) primero; luego operación y confianza; fuera del backlog inmediato lo que sea fase 2 (Tap to Pay, multi-banco, veeduría pública).

Fuentes: [`JoseMaza.md`](JoseMaza.md), [`CarlosPrimo.md`](CarlosPrimo.md), [`JesusBorrero.md`](JesusBorrero.md), [`SergioMancilla.md`](SergioMancilla.md).

| Prioridad | Historia | Propuesta por | Por qué entra al backlog |
| :---: | --- | :---: | --- |
| 1 | Como **músico/staff** quiero **enviar lo de mi wallet a Bancolombia en pocos toques** para **usar la plata en pesos**. | José / Sergio | Cierra el MVP; sin esto no hay valor percibido. |
| 2 | Como **músico** quiero **recibir el pago la misma noche** para **no esperar semanas**. | José / Jesús | Fibra y promesa central del producto. |
| 3 | Como **pagador** quiero **cargar una lista y dispersar el lote de una vez** para **cerrar el evento sin 40 transferencias**. | José / Carlos | Motor operativo; sin lote no hay Orilla. |
| 4 | Como **trabajador** quiero **ver “Te pagaron $X” en el celular** para **dejar de perseguir al coordinador**. | Sergio / José | Confianza inmediata post-pago. |
| 5 | Como **trabajador** quiero **un SMS/link de invitación** para **entrar al flujo sin fricción**. | Carlos | Activación del receptor. |
| 6 | Como **pagador** quiero **ver progreso del lote (ok / pendiente / fallido)** para **saber si puedo cerrar**. | Sergio / José | Operación y Demo Day. |
| 7 | Como **pagador/trabajador** quiero **comprobante por pago** para **resolver “¿ya me pagaste?”**. | José / Jesús | Pertinencia Stellar / menos reclamos. |
| 8 | Como **trabajador** quiero **onboarding ≤ 3 pasos sin jerga crypto** para **cobrar el mismo día**. | Sergio / José | Adopción en economía informal. |

**Queda fuera del backlog MVP (fase 2):** Tap to Pay / cobros POS, multi-banco completo, plantillas avanzadas, veeduría pública, pausa compleja de lotes, reputación de trabajadores.

---

## 2. Propuesta de valor

> Extensión: 150–300 palabras.

**Usuario (del Problem Brief):** músico, staff o trabajador de evento/economía informal que hoy espera días o semanas para cobrar un trabajo ya hecho; y el pagador (hotel, productora, organizador) que liquida uno a uno.

**Resultado que obtiene:** el trabajador cobra al terminar el show/turno y manda la plata a Bancolombia en minutos. El pagador cierra la noche con un solo lote en lugar de decenas de transferencias y chats de reclamo.

**Por qué elegiría esta solución:** porque el dolor no es “falta de un datáfono”, sino **tiempo hasta el dinero usable**. Orilla ataca esa espera con un flujo que el trabajador entiende (“Te pagaron” → “Enviar a Bancolombia”) y que el pagador opera como lista, no como cola de caja. La historia es emocionalmente clara: *yo ya trabajé; mi plata no puede quedarse dos semanas en el hotel*.

**En qué se diferencia de cómo lo resuelve hoy:** hoy hay Excel, transferencia tardía o efectivo sin rastro. Orilla dispersa masivo, deja comprobante por persona y termina en el banco que la gente ya usa. Frente a apps de cobro (Nequi/Bre-B/Tap to Pay), Orilla no compite en el mostrador: **paga a quien ya trabajó**.

---

## 3. Flujo de usuario

> Extensión: 150–300 palabras.

```text
Pagador                Orilla / Stellar           Trabajador              Bancolombia
   |                         |                         |                       |
   |-- 1. Carga lista ------->|                         |                       |
   |-- 2. Fondea / lanza ---->|                         |                       |
   |                         |-- 3. Pago + SMS -------->|                       |
   |                         |                         |-- 4. Ve “Te pagaron”  |
   |                         |                         |-- 5. Cash-out ------->|
   |                         |                         |<-- 6. COP disponible -|
```

| Paso | Rol | Qué hace | Punto de interacción |
| :---: | :---: | --- | --- |
| 1 | Pagador | Arma lista (nombre, celular, monto, rol) o sube CSV | Web Orilla — pantalla “Nuevo lote” |
| 2 | Pagador | Confirma y lanza el lote (“Cerrar la noche”) | Web Orilla — confirmación + saldo |
| 3 | Sistema | Ejecuta pagos en Stellar; notifica a cada receptor | SDP / red Stellar + SMS/email |
| 4 | Trabajador | Abre link, verifica celular, ve “Te pagaron $X” | App/web móvil receptor |
| 5 | Trabajador | Toca “Enviar a Bancolombia”, confirma cuenta | Pantalla cash-out (off-ramp) |
| 6 | Trabajador | Recibe COP en su cuenta (o confirmación sandbox en demo) | Banco / comprobante en Orilla |
| 7 | Pagador | Revisa lote: ok / fallidos; descarga resumen | Dashboard de lote |

Roles: **pagador** (hotel/productora), **trabajador** (héroe), **sistema** (Orilla + Stellar + ancla). Puntos críticos de interacción: lanzamiento del lote y botón Bancolombia.

---

## 4. Alcance del MVP

> Extensión: 150–300 palabras.

| Dentro del MVP (funcionalidad central) | Fuera del MVP (deseable, para después) |
| --- | --- |
| Carga de lista / CSV y lanzamiento de lote (testnet) | Tap to Pay / cobro en punto de venta |
| Pago masivo a wallets (SDP u equivalente) | Multi-banco y Bre-B nativo |
| Registro receptor por celular + “Te pagaron $X” | App nativa stores; nómina corporativa |
| UX cash-out “Enviar a Bancolombia” (sandbox/partner) | Off-ramp producción con compliance completo |
| Estado de lote: ok / pendiente / fallido | Veeduría pública / panel ciudadano |
| Comprobante con enlace a explorador | Plantillas avanzadas y ERP |

**Por qué el recorte sigue entregando valor:** el MVP demuestra el ciclo completo que duele — *trabajé → me pagaron → plata en mi banco* — con un lote pequeño (5–20 personas). No hace falta el ecosistema de cobros del mostrador para probar la promesa. Un mock/sandbox de Bancolombia en Demo Day es aceptable si la UX es realista y el pago on-chain es real en testnet; la fibra y el flujo bastan para validar producto.

---

## 5. Lean Canvas

> Extensión: enlace (obligatorio).

**Enlace al Lean Canvas (obligatorio):** [Lean Canvas — Orilla](https://github.com/Jgmaza/bb101-caribe-lab/blob/main/docs/semana2/LeanCanvas.md)

El lienzo cubre: problema, segmentos, propuesta de valor única, solución, canales, métricas clave, ventaja diferencial, costos e ingresos.

---

## 6. Backlog priorizado (Kanban)

> Extensión: enlace al tablero (obligatorio).

**Enlace al tablero (obligatorio):** [Tablero Kanban Orilla — GitHub Projects](https://github.com/users/Jgmaza/projects/1)

**Issues del backlog (criterios de aceptación en cada tarjeta):** [Issues label `orilla-mvp`](https://github.com/Jgmaza/bb101-caribe-lab/issues?q=is%3Aissue+label%3Aorilla-mvp)

**Espejo markdown:** [`Kanban.md`](Kanban.md)

Columnas del tablero (Status): **Todo** · **In Progress** · **Done**.  
Las historias P1 (#1–#4) están listas para empezar; P2 (#5–#8) siguen en cola del mismo board.

Resumen de tarjetas (prioridad = orden del backlog):

| Issue | Historia | Criterios de aceptación (resumen) |
| :---: | --- | --- |
| [#1](https://github.com/Jgmaza/bb101-caribe-lab/issues/1) | US-1 Cash-out a Bancolombia | ≤ 4 taps; confirma cuenta; muestra estado éxito/pendiente |
| [#2](https://github.com/Jgmaza/bb101-caribe-lab/issues/2) | US-2 Pago misma noche (promesa) | Lote se ejecuta en minutos en demo; trabajador ve saldo |
| [#3](https://github.com/Jgmaza/bb101-caribe-lab/issues/3) | US-3 Dispersión de lote | CSV/form ≥ 5 receivers; un clic lanza; tx por persona |
| [#4](https://github.com/Jgmaza/bb101-caribe-lab/issues/4) | US-4 Pantalla “Te pagaron $X” | Monto, pagador/evento, hora; sin jerga crypto |
| [#5](https://github.com/Jgmaza/bb101-caribe-lab/issues/5) | US-5 Invitación SMS/link | Link profundo; primer uso completa registro |
| [#6](https://github.com/Jgmaza/bb101-caribe-lab/issues/6) | US-6 Dashboard de lote | Contadores ok/pendiente/fallido; detalle por fila |
| [#7](https://github.com/Jgmaza/bb101-caribe-lab/issues/7) | US-7 Comprobante | Hash o link a explorador Stellar visible |
| [#8](https://github.com/Jgmaza/bb101-caribe-lab/issues/8) | US-8 Onboarding ≤ 3 pasos | Celular → verificación → listo para cobrar |

---

## 7. Arquitectura inicial

> Extensión: 150–300 palabras.

**Diagrama:**

```text
┌──────────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│  Web Pagador     │────▶│  Backend Orilla     │────▶│  SDP / TSS       │
│  (lista, lote)   │     │  (API, auth, CSV)   │     │  (dispersión)    │
└──────────────────┘     └──────────┬──────────┘     └────────┬─────────┘
                                   │                           │
                                   │                           ▼
                                   │                  ┌──────────────────┐
                                   │                  │  Red Stellar     │
                                   │                  │  (pagos USDC)    │
                                   │                  └────────┬─────────┘
                                   ▼                           │
┌──────────────────┐     ┌─────────────────────┐              │
│  Web/App Worker  │◀────│  Wallet + registro   │◀─────────────┘
│  “Te pagaron”    │     │  (SEP-10/24 si aplica)│
└────────┬─────────┘     └──────────┬──────────┘
         │                          │
         ▼                          ▼
┌──────────────────┐     ┌─────────────────────┐
│  Off-ramp UX     │────▶│  Ancla / partner     │──▶ Bancolombia (COP)
│  “Bancolombia”   │     │  (sandbox en MVP)    │
└──────────────────┘     └─────────────────────┘
```

| Capa | Componente | Qué hace |
| :---: | --- | --- |
| Interfaz | Web pagador + web móvil trabajador | Lista/lote, “Te pagaron”, cash-out |
| Lógica | Backend Orilla | Usuarios, CSV, estados de lote, notificaciones |
| Stellar | SDP + pagos + wallet | Dispersión masiva, saldo, comprobantes |
| Fiat | Ancla / mock off-ramp | USDC → COP hacia Bancolombia |

**En qué punto entra la red:** cuando el pagador lanza el lote, el backend encola pagos y la red Stellar liquida a cada wallet. El segundo toque de red/ancla ocurre en el cash-out (retiro a banco). Off-chain quedan PII del CSV, estados de UI y el partner bancario.

---

## 8. Uso de Stellar y justificación

> Extensión: 150–300 palabras.

**Criterio de pertinencia (del Problem Brief):** pagador y trabajador no se confían entre sí sobre “¿ya se pagó?”; necesitan un registro compartido del pago ejecutado que no dependa de reescribir el Excel del hotel. Además se reduce el intermediario que hoy concentra la liquidación manual uno a uno.

| Componente de Stellar | Para qué lo usamos | Por qué ese y no otra alternativa |
| --- | --- | --- |
| **Stellar Disbursement Platform (SDP)** | Dispersar el lote a muchos receivers | Stack listo para pagos masivos; evita reinventar colas y registro de receivers |
| **Pagos / USDC (o asset testnet)** | Mover valor al trabajador | Liquidación 24/7 y fees bajos; estable frente a volatilidad para demos |
| **Wallet on-demand + deep link** | Recibir sin cuenta previa en crypto | Baja barrera para economía informal |
| **Explorador / hash de tx** | Comprobante verificable | Prueba neutral frente a “ya te pagué” en WhatsApp |
| **Ancla / SEP-24 (o partner off-ramp)** | Camino a Bancolombia | El usuario final vive en COP; Stellar no sustituye al banco, lo alimenta |

No usamos Stellar como “base de datos de eventos” cosméticos: **entra cuando hay que pagar de verdad**. Una DB tradicional puede listar staff; no sustituye un comprobante compartido de pago ni la liquidación masiva barata. El MVP puede correr en testnet; la justificación de arquitectura se mantiene en mainnet con partner de cash-out.
