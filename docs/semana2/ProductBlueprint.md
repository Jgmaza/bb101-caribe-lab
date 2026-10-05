# Product Blueprint

## **Nombre del proyecto:** Orilla

## **Repositorio (enlace obligatorio):** [bb101-caribe-lab](https://github.com/Jgmaza/bb101-caribe-lab)

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

**Criterio de priorización:** imprescindibles para el happy path del MVP (pagador lanza lote → trabajador ve pago → cash-out a Bancolombia) primero; luego operación y confianza; fuera del backlog inmediato lo que sea fase 2 (Tap to Pay, multi-banco, veeduría pública, liberación condicionada avanzada y distribución por porcentajes/QR).

Fuentes: [`JoseMaza.md`](JoseMaza.md), [`CarlosPrimo.md`](CarlosPrimo.md), [`JesusBorrero.md`](JesusBorrero.md), [`SergioMancilla.md`](SergioMancilla.md).

| Prioridad | Historia                                                                                                                     | Propuesta por | Por qué entra al backlog                        |
| :-------: | ---------------------------------------------------------------------------------------------------------------------------- | :-----------: | ----------------------------------------------- |
|     1     | Como **músico/staff** quiero **enviar lo de mi wallet a Bancolombia en pocos toques** para **usar la plata en pesos**.       | José / Sergio | Cierra el MVP; sin esto no hay valor percibido. |
|     2     | Como **músico** quiero **recibir el pago la misma noche** para **no esperar semanas**.                                       |  José / Jesús | Fibra y promesa central del producto.           |
|     3     | Como **productora de eventos** quiero **cargar la lista del staff y pagar los montos acordados en un lote** para **cerrar el evento sin hacer transferencias una por una**. | José / Carlos | Motor operativo; sin lote no hay Orilla.        |
|     4     | Como **trabajador** quiero **ver “Te pagaron $X” en el celular** para **dejar de perseguir al coordinador**.                 | Sergio / José | Confianza inmediata post-pago.                  |
|     5     | Como **trabajador** quiero **recibir un SMS con el enlace al pago de mi evento** para **consultar el monto y su estado desde mi celular**.                              |     Carlos    | Activación del receptor.                        |
|     6     | Como **pagador** quiero **ver progreso del lote (ok / pendiente / fallido)** para **saber si puedo cerrar**.                 | Sergio / José | Operación y Demo Day.                           |
|     7     | Como **pagador/trabajador** quiero **comprobante por pago** para **resolver “¿ya me pagaste?”**.                             |  José / Jesús | Pertinencia Stellar / menos reclamos.           |
|     8     | Como **trabajador** quiero **onboarding ≤ 3 pasos sin jerga crypto** para **cobrar el mismo día**.                           | Sergio / José | Adopción en economía informal.                  |

**Queda fuera del backlog MVP (fase 2):** Tap to Pay / cobros POS, multi-banco completo, plantillas avanzadas, veeduría pública, pausa compleja de lotes, reputación de trabajadores, **liberación condicionada avanzada con confirmaciones de pagador/trabajador** y **distribución automática por porcentajes mediante QR**.

**Extensión propuesta para fase 2 — pago asegurado:** el pagador podría fondear el evento con un día de anticipación. El dinero quedaría reservado y no disponible para el trabajador hasta que se cumplan las condiciones de liberación. Como mecanismo inicial de confianza, se propone que la confirmación del equipo/trabajadores tenga un peso de **0.4** y la confirmación del responsable del establecimiento tenga un peso de **0.6**. Al alcanzar el umbral de liberación, Orilla ejecutaría el pago.

**Extensión propuesta para fase 2 — distribución por porcentajes:** un evento podría tener una configuración pública de participantes y porcentajes de distribución. El pagador realizaría un único pago a una dirección/QR del evento y Orilla calcularía y ejecutaría automáticamente las transferencias individuales según los porcentajes registrados. Esta funcionalidad se mantiene fuera del MVP porque introduce configuración de participantes, validación de porcentajes, cambios de integrantes y manejo de disputas.

---

## 2. Propuesta de valor

> Extensión: 150–300 palabras.

**Usuario (del Problem Brief):** músico, staff o trabajador de evento/economía informal que hoy espera días o semanas para cobrar un trabajo ya hecho; y el pagador (hotel, productora, organizador) que liquida uno a uno.

**Resultado que obtiene:** el trabajador cobra al terminar el show/turno y manda la plata a Bancolombia en minutos. El pagador cierra la noche con un solo lote en lugar de decenas de transferencias y chats de reclamo.

**Por qué elegiría esta solución:** porque el dolor no es “falta de un datáfono”, sino **tiempo hasta el dinero usable y falta de certeza sobre cuándo será pagado**. Orilla ataca esa espera con un flujo que el trabajador entiende (“Te pagaron” → “Enviar a Bancolombia”) y que el pagador opera como lista, no como cola de caja. La historia es emocionalmente clara: *yo ya trabajé; mi plata no puede quedarse dos semanas en el hotel*.

Como extensión, Orilla puede aumentar todavía más la confianza si el pagador **fondea el evento antes de que ocurra**. De esta manera, el trabajador puede saber que los recursos ya fueron apartados para su pago, aunque la liberación efectiva ocurra cuando se confirme que el evento se realizó.

En una fase posterior, Orilla también puede permitir que el organizador configure previamente cuánto corresponde a cada integrante del equipo. Así, un solo pago del establecimiento puede distribuirse automáticamente entre músicos y staff, evitando cálculos y transferencias manuales.

**En qué se diferencia de cómo lo resuelve hoy:** hoy hay Excel, transferencia tardía o efectivo sin rastro. Orilla dispersa masivo, deja comprobante por persona y termina en el banco que la gente ya usa. Frente a apps de cobro (Nequi/Bre-B/Tap to Pay), Orilla no compite en el mostrador: **paga a quien ya trabajó**.

---

## 3. Flujo de usuario

> Extensión: 150–300 palabras.

**Flujo del MVP:** pagador carga la lista y fondea el lote → autoriza los pagos → trabajador recibe en su wallet → solicita el retiro a Bancolombia (simulado en la demo si no hay integración real).

**El diagrama siguiente corresponde a la extensión de fase 2**, con reserva de fondos y confirmaciones de ambas partes.

```text
Pagador                Orilla / Stellar           Trabajador              Bancolombia
   |                         |                         |                       |
   |-- 1. Carga lista ------->|                         |                       |
   |-- 2. Fondea / reserva -->|                         |                       |
   |                         |-- 3. Evento + pago ---->|                       |
   |                         |   reservado             |                       |
   |                         |                         |                       |
   |                         |<-- 4. Confirmación -----|                       |
   |<-- 5. Confirma evento ---|                         |                       |
   |                         |                         |                       |
   |                         |-- 6. Libera pago ------>|                       |
   |                         |                         |-- 7. Cash-out ------->|
   |                         |                         |<-- 8. COP disponible -|
```

| Paso |     Rol    | Qué hace                                                        | Punto de interacción                 |
| :--: | :--------: | --------------------------------------------------------------- | ------------------------------------ |
|   1  |   Pagador  | Arma lista (nombre, celular, monto, rol) o sube CSV             | Web Orilla — pantalla “Nuevo lote”   |
|   2  |   Pagador  | Fondea/reserva el monto del evento, idealmente con anticipación | Web Orilla — confirmación + saldo    |
|   3  |   Sistema  | Registra el pago reservado y notifica a cada receptor           | SDP / red Stellar + SMS/email        |
|   4  | Trabajador | Tras realizarse el evento, confirma que ya trabajó              | App/web móvil receptor               |
|   5  |   Pagador  | Confirma que el evento se realizó y que puede cerrarse el lote  | Web Orilla — confirmación del evento |
|   6  |   Sistema  | Verifica las condiciones de liberación y ejecuta el pago        | Backend Orilla + Stellar             |
|   7  | Trabajador | Toca “Enviar a Bancolombia”, confirma cuenta                    | Pantalla cash-out (off-ramp)         |
|   8  | Trabajador | Recibe COP en su cuenta (o confirmación sandbox en demo)        | Banco / comprobante en Orilla        |
|   9  |   Pagador  | Revisa lote: ok / pendientes; descarga resumen                  | Dashboard de lote                    |

Para el MVP, el flujo recomendado sigue siendo el actual: **pagador lanza → Stellar liquida → trabajador ve el pago → cash-out**. El fondeo anticipado y la liberación mediante confirmaciones se consideran una extensión porque agregan estados y reglas de autorización que no son necesarios para demostrar el happy path.

En fase 2, el mecanismo de confirmaciones podría usar un sistema ponderado: **0.4 para la confirmación del equipo/trabajadores y 0.6 para la confirmación del responsable del establecimiento**. La liberación se produciría cuando se alcance el umbral definido por Orilla.

Roles: **pagador** (hotel/productora), **trabajador** (héroe), **sistema** (Orilla + Stellar + ancla). Puntos críticos de interacción: lanzamiento/fondeo del lote, confirmación del evento y botón Bancolombia.

---

## 4. Alcance del MVP

> Extensión: 150–300 palabras.

| Dentro del MVP (funcionalidad central)                             | Fuera del MVP (deseable, para después)                  |
| ------------------------------------------------------------------ | ------------------------------------------------------- |
| Carga de lista / CSV y lanzamiento de lote (testnet)               | Tap to Pay / cobro en punto de venta                    |
| Pago masivo a wallets (SDP u equivalente)                          | Multi-banco y Bre-B nativo                              |
| Registro receptor por celular + “Te pagaron $X”                    | App nativa stores; nómina corporativa                   |
| UX cash-out “Enviar a Bancolombia” (sandbox/partner)               | Off-ramp producción con compliance completo             |
| Estado de lote: ok / pendiente / fallido                           | Veeduría pública / panel ciudadano                      |
| Comprobante con enlace a explorador                                | Plantillas avanzadas y ERP                              |
| **Fondeo anticipado simple, si no modifica el happy path del MVP** | **Liberación condicionada por confirmaciones 0.4/0.6**  |
|                                                                    | **Distribución automática por porcentajes mediante QR** |

**Por qué el recorte sigue entregando valor:** el MVP demuestra el ciclo completo que duele — *trabajé → me pagaron → plata en mi banco* — con un lote pequeño (5–20 personas). No hace falta el ecosistema de cobros del mostrador para probar la promesa.

El concepto de **fondeo anticipado** puede evaluarse como una mejora de confianza durante el MVP únicamente si se implementa de forma sencilla: el pagador deposita/fondea los recursos antes del evento y Orilla muestra que el saldo destinado al lote está asegurado. No es necesario implementar todavía la lógica completa de liberación ponderada.

La **liberación condicionada** queda para después porque requiere resolver preguntas adicionales: qué sucede si solo una parte confirma, cuánto tiempo tiene cada parte para confirmar, qué ocurre ante desacuerdo, quién puede desbloquear un pago y cómo se manejan cancelaciones.

La **distribución por porcentajes y QR** también queda fuera del MVP. Aunque puede reducir considerablemente el trabajo operativo, introduce un modelo de “evento/equipo” diferente al actual modelo de “lista de receptores”. Un mock/sandbox de Bancolombia en Demo Day sigue siendo aceptable si la UX es realista y el pago on-chain es real en testnet; la fibra y el flujo bastan para validar producto.

---

## 5. Lean Canvas

> Extensión: enlace (obligatorio).

**Enlace al Lean Canvas (obligatorio):** [Lean Canvas — Orilla](https://github.com/Jgmaza/bb101-caribe-lab/blob/main/docs/semana2/LeanCanvas.md)

El lienzo cubre: problema, segmentos, propuesta de valor única, solución, canales, métricas clave, ventaja diferencial, costos e ingresos.

**Extensión futura sugerida para el Lean Canvas:** la propuesta puede evolucionar de “pago rápido” a **“pago asegurado y verificable”**: el pagador puede separar los fondos antes del evento y el trabajador puede conocer que el dinero destinado al pago ya está disponible.

---

## 6. Backlog priorizado (Kanban)

> Extensión: enlace al tablero (obligatorio).

**Enlace al tablero (obligatorio):** [Tablero Kanban Orilla — GitHub Projects](https://github.com/users/Jgmaza/projects/1)

**Issues del backlog (criterios de aceptación en cada tarjeta):** [Issues label `orilla-mvp`](https://github.com/Jgmaza/bb101-caribe-lab/issues?q=is%3Aissue+label%3Aorilla-mvp)

**Espejo markdown:** [`Kanban.md`](Kanban.md)

Columnas del tablero (Status): **Todo** · **In Progress** · **Done**.
Las historias P1 (#1–#4) están listas para empezar; P2 (#5–#8) siguen en cola del mismo board.

### Resumen de tarjetas (prioridad = orden del backlog):

|                           Issue                           | Historia                        | Criterios de aceptación (resumen)                         |
| :-------------------------------------------------------: | ------------------------------- | --------------------------------------------------------- |
| [#1](https://github.com/Jgmaza/bb101-caribe-lab/issues/1) | US-1 Cash-out a Bancolombia     | ≤ 4 taps; confirma cuenta; muestra estado éxito/pendiente |
| [#2](https://github.com/Jgmaza/bb101-caribe-lab/issues/2) | US-2 Pago misma noche (promesa) | Lote se ejecuta en minutos en demo; trabajador ve saldo   |
| [#3](https://github.com/Jgmaza/bb101-caribe-lab/issues/3) | US-3 Dispersión de lote         | Lista ≥ 5; revisa total; fondos suficientes; tx por pago completado     |
| [#4](https://github.com/Jgmaza/bb101-caribe-lab/issues/4) | US-4 Pantalla “Te pagaron $X”   | Monto, pagador/evento, hora; sin jerga crypto             |
| [#5](https://github.com/Jgmaza/bb101-caribe-lab/issues/5) | US-5 Invitación SMS/link        | Registro por celular; enlace al evento; invitación ≠ pago completado               |
| [#6](https://github.com/Jgmaza/bb101-caribe-lab/issues/6) | US-6 Dashboard de lote          | Contadores ok/pendiente/fallido; detalle por fila         |
| [#7](https://github.com/Jgmaza/bb101-caribe-lab/issues/7) | US-7 Comprobante                | Hash o link a explorador Stellar visible                  |
| [#8](https://github.com/Jgmaza/bb101-caribe-lab/issues/8) | US-8 Onboarding ≤ 3 pasos       | Celular → verificación → listo para cobrar                |

**Backlog futuro recomendado — pago asegurado:**

* **Evento fondeado:** el pagador deposita el monto del lote con anterioridad y Orilla marca los fondos como reservados para ese evento.
* **Confirmación del trabajador/equipo:** después del evento, los participantes pueden confirmar que el trabajo fue realizado.
* **Confirmación del pagador:** el responsable del establecimiento confirma que el evento se realizó.
* **Regla ponderada:** confirmación equipo = 0.4; confirmación pagador = 0.6.
* **Liberación:** al alcanzar el umbral definido, Orilla ejecuta la distribución.
* **Excepciones:** cancelación, desacuerdo o ausencia de una confirmación deben resolverse mediante reglas explícitas antes de llevar esta funcionalidad a producción.

**Backlog futuro recomendado — equipo y QR:**

* Crear un **perfil/equipo de evento**.
* Definir integrantes y porcentaje individual.
* Validar que la suma de porcentajes sea exactamente 100%.
* Generar un QR único del equipo/evento.
* El pagador escanea el QR y realiza un único pago.
* Orilla distribuye automáticamente el monto entre las wallets de los integrantes.
* Registrar la distribución individual y generar comprobantes separados.

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

Para la extensión de **pago asegurado**, el backend necesitaría agregar un estado intermedio al lote. En lugar de pasar directamente de `funded` a `paid`, el flujo podría manejar estados como `funded → event_pending → confirmed → released → paid`. La lógica de pesos 0.4/0.6 debería permanecer principalmente en el backend, mientras que Stellar conserva el rol de custodiar/mover el valor y registrar las transacciones.

Para la extensión de **distribución por porcentajes**, el modelo de datos tendría que introducir una entidad de equipo/evento que relacione una dirección o QR con varios receptores y sus porcentajes. El backend calcularía los montos individuales y utilizaría el mecanismo de dispersión existente para ejecutar las transferencias.

|   Capa   | Componente                         | Qué hace                                       |
| :------: | ---------------------------------- | ---------------------------------------------- |
| Interfaz | Web pagador + web móvil trabajador | Lista/lote, “Te pagaron”, cash-out             |
|  Lógica  | Backend Orilla                     | Usuarios, CSV, estados de lote, notificaciones |
|  Stellar | SDP + pagos + wallet               | Dispersión masiva, saldo, comprobantes         |
|   Fiat   | Ancla / mock off-ramp              | USDC → COP hacia Bancolombia                   |
|  Fase 2  | Motor de reglas de liberación      | Confirmaciones y cálculo de umbral             |
|  Fase 2  | Configuración de equipo/QR         | Porcentajes y distribución automática          |

**En qué punto entra la red:** cuando el pagador lanza el lote, el backend encola pagos y la red Stellar liquida a cada wallet. El segundo toque de red/ancla ocurre en el cash-out (retiro a banco). Off-chain quedan PII del CSV, estados de UI y el partner bancario.

En una futura versión con pago asegurado, Stellar también puede participar en el momento de **fondeo y liberación del valor**, mientras que la lógica de quién confirmó y cuándo permanece en Orilla.

---

## 8. Uso de Stellar y justificación

> Extensión: 150–300 palabras.

**Criterio de pertinencia (del Problem Brief):** pagador y trabajador no se confían entre sí sobre “¿ya se pagó?”; necesitan un registro compartido del pago ejecutado que no dependa de reescribir el Excel del hotel. Además se reduce el intermediario que hoy concentra la liquidación manual uno a uno.

La idea de fondeo anticipado refuerza este criterio: el trabajador no solamente podría comprobar que recibió el pago, sino potencialmente que **los fondos destinados al evento ya fueron fondeados antes de trabajar**. Esto convierte a Orilla en una capa de confianza entre pagador y trabajador.

| Componente de Stellar                    | Para qué lo usamos                                           | Por qué ese y no otra alternativa                                                  |
| ---------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| **Stellar Disbursement Platform (SDP)**  | Dispersar el lote a muchos receivers                         | Stack listo para pagos masivos; evita reinventar colas y registro de receivers     |
| **Pagos / USDC (o asset testnet)**       | Mover valor al trabajador                                    | Liquidación 24/7 y fees bajos; estable frente a volatilidad para demos             |
| **Wallet on-demand + deep link**         | Recibir sin cuenta previa en crypto                          | Baja barrera para economía informal                                                |
| **Explorador / hash de tx**              | Comprobante verificable                                      | Prueba neutral frente a “ya te pagué” en WhatsApp                                  |
| **Ancla / SEP-24 (o partner off-ramp)**  | Camino a Bancolombia                                         | El usuario final vive en COP; Stellar no sustituye al banco, lo alimenta           |
| **Fondeo/reserva on-chain — fase 2**     | Mantener el valor destinado al evento antes de su liberación | Aumenta la confianza porque el pago puede quedar respaldado antes del trabajo      |
| **Distribución multi-receiver — fase 2** | Distribuir un único pago entre integrantes según porcentajes | Aprovecha la capacidad de Stellar para liquidar múltiples pagos de forma eficiente |

La regla **0.4/0.6 no necesita estar necesariamente implementada como lógica nativa de Stellar**. La decisión de si el evento fue confirmado puede vivir en el backend de Orilla. Stellar entra cuando hay que custodiar/mover el valor y cuando se ejecuta la liberación, dejando una prueba verificable de la transacción.

Para el QR de equipo ocurre algo similar: el QR puede simplemente identificar al equipo y su configuración pública de distribución; el backend calcula los montos y Stellar ejecuta las transferencias. Esto evita convertir la blockchain en una base de datos de configuración.

No usamos Stellar como “base de datos de eventos” cosméticos: **entra cuando hay que pagar de verdad**. Una DB tradicional puede listar staff, porcentajes y confirmaciones; no sustituye un comprobante compartido de pago ni la liquidación masiva barata. El MVP puede correr en testnet; la justificación de arquitectura se mantiene en mainnet con partner de cash-out.
