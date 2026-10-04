# Problem Brief

> **Pivot (post Entregable 1):** el equipo mantiene el stack de **pagos masivos en Stellar**, pero cambia el propósito de “transparencia de apoyos/sponsors” a **pagos rápidos para economía informal / eventos** (músico, staff, feria → wallet → Bancolombia).  
> Detalle de producto: [`../producto/Orilla-MVP.md`](../producto/Orilla-MVP.md) · Comparativa: [`../producto/Comparativa-TapToPay.md`](../producto/Comparativa-TapToPay.md).

---

## Decisión del problema

### Problema elegido

Los trabajadores de la economía informal y de eventos (músicos, staff, vendedores de feria) esperan días o semanas para cobrar un trabajo ya entregado; mientras tanto el pagador (hotel, productora, organizador) concentra el dinero y la “verdad” del pago. **Propuesto / pivot liderado por José Maza** (evolución de la línea SDP del Entregable 1).

### Por qué elegimos este

Priorizamos un caso con **movimiento real de valor**, fibra humana clara (“trabajé hoy, cobré hoy”) y encaje natural con dispersión masiva en Stellar. El MVP es demostrable: lote de pagos → wallet → UX de cash-out a Bancolombia. Frente a cobros PyME + Tap to Pay / Bre-B (idea de otro grupo), Orilla ataca el lado **payout** (pagar a muchos), donde Stellar aporta más y no pelea de frente con el sistema de cobros del BanRep.

### Propuestas descartadas o aparcadas

1. **Transparencia de desembolsos sponsors/apoyos (E1 provisional):** válido, pero suena a herramienta de fundación/Estado y pierde “wow” frente a ideas de cobro cotidiano. La trazabilidad queda como **subproducto**.
2. **Remesas Atlántico → comercio local** (Carlos Primo): fuerte Stellar; aparcada / posible fase 2 de cash-out.
3. **Pesca artesanal + liquidación** (Jesús Borrero): alto impacto Caribe; oráculo físico difícil en 5 semanas.
4. **Transparencia de obras públicas** (Sergio Mancilla): riesgo de dashboard SECOP sin liberación de pagos.

### Cómo tomamos la decisión

Consenso provisional E1 sobre SDP; **ratificación de pivot** hacia economía informal / eventos para vender propósito social + MVP práctico (wallet → Bancolombia) y competir en Demo Day con una historia tan clara como Tap to Pay, pero en el lado del trabajador.

---

## Problem Brief

### Encabezado

**Orilla** — Que quien trabaja hoy, cobre hoy: pagos rápidos a músicos, staff y trabajadores de evento en el Caribe, hasta su cuenta Bancolombia.

### Equipo y roles

| Integrante | GitHub | Rol provisional |
|---|---|---|
| José Maza | Jgmaza | Responsable de entregas, docs y coordinación |
| Carlos Primo | Carlosprimo | Research / producto |
| Jesús Borrero | jesubohr | Research / campo |
| Sergio Mancilla | athomserx | Frontend / UX |

Canal interno: por definir (chat del bootcamp / WhatsApp del equipo).

### Problema y evidencia

**Problema:** en la economía informal y de eventos, el pago llega tarde, opaco y a pedazos — aunque el trabajo ya se hizo.

Un músico puede tocar un viernes en un hotel y esperar hasta dos semanas el giro. Staff de Carnaval, ferias o conciertos cierra de madrugada y cobra en efectivo o “cuando salga la transferencia”. Productoras y hoteles pagan uno a uno (Excel + banco), con errores y reclamos. El patrón se repite cada show, cada noche de evento, cada temporada de Carnaval. El costo no es solo “incomodidad”: es arriendo, mercado y transporte que no pueden esperar. Evidencia de partida: experiencia directa del equipo (músicos / freelancers), observación de pagos a staff de eventos locales, y el volumen de la economía de Carnaval/turismo en Barranquilla como contexto de muchos pagos fragmentados. Alcance MVP: un piloto demo de decenas de receivers (staff/músicos ficticios o reales voluntarios) con cash-out UX a Bancolombia.

### Usuario y actores

**Usuario primario (héroe):** músico, staff o trabajador de evento que necesita cobrar al terminar y pasar la plata a su banco sin pedirle favores a nadie. Hoy espera, persigue al pagador, acepta efectivo riesgoso o firmas de planilla; el costo es tiempo, incertidumbre y desconfianza.

**Usuario pagador:** hotel, productora, organizador de feria/Carnaval que necesita cerrar la noche sin 40 transferencias manuales ni reclamos al día siguiente.

**Actores:** (1) Pagador — fondea y lanza el lote; (2) Orilla / motor de dispersión — ejecuta pagos; (3) Trabajador — recibe en wallet; (4) Ancla / rail local — cash-out a COP; (5) Banco del trabajador (MVP: Bancolombia) — destino final. La confianza se reparte: el trabajador deja de depender del “te pago el lunes” sin comprobante.

### Flujo actual de valor

1. Se acuerda el show / turno / servicio (a veces verbal).
2. Se presta el trabajo (viernes noche, cierre de evento).
3. El pagador registra en Excel o “lista de caja”.
4. Días o semanas después, tesorería programa transferencias o paga en efectivo.
5. El banco/canal liquida (o el efectivo cambia de manos).
6. El trabajador cobra; a veces sin recibo útil.
7. Si hay disputa (“¿ya te pagué?”), solo quedan chats y memoria.

Intermediarios: tesorería del pagador, banco, a veces un coordinador de staff. El dinero y la verdad del pago viven en sistemas privados.

### Fricciones identificadas

1. **Demora post-trabajo (pasos 3–4):** el trabajador financia al pagador con su tiempo; afecta al héroe.
2. **Pago uno a uno (paso 4):** errores de cuenta, olvidos, reclamos; afecta pagador y trabajador.
3. **Efectivo (paso 5):** riesgo y sin rastro; afecta ambos.
4. **Sin comprobante universal (pasos 6–7):** “me lo debes” vs “ya te pagué”; afecta confianza.
5. **Cash-out confuso si hubiera crypto sin UX:** fricción que el MVP debe eliminar con “Enviar a Bancolombia”.

**Fricción priorizada:** la demora entre trabajo hecho y dinero usable en el banco del trabajador.

### Oportunidad e hipótesis

**Oportunidad:** dispersar el lote al cierre del evento y dar al trabajador un camino de ≤ 4 taps hasta Bancolombia.

**Hipótesis:** si el pagador lanza un lote sobre Stellar (SDP u equivalente) y el receptor tiene wallet + flujo claro de off-ramp, entonces el tiempo percibido pasa de semanas a minutos, baja el reclamo, y el trabajador recupera dignidad de pago. Elegimos esta fricción porque mueve valor, toca fibra, y el Demo Day se entiende en 90 segundos.

### Criterio de pertinencia

Pagador y trabajador (y a veces un intermediario de staff) **no se confían entre sí** sobre “¿ya se pagó?”. Un Excel del hotel sigue siendo su verdad. Un ledger compartido con pago ejecutado deja comprobante que no depende de reescribir la hoja. Además se reduce el rol del intermediario que hoy concentra la liquidación manual. Una DB privada del hotel no basta para la promesa de “ya está pagado y puedo llevarlo a mi banco”.

### Supuestos y riesgos

**Supuestos:**
1. Hay un pagador demo (hotel/productora/simulación) dispuesto a lanzar un lote.
2. El trabajador acepta un flujo móvil simple si el botón final es “Bancolombia”.
3. El off-ramp puede mostrarse en sandbox/mock en aula y con partner real en fase 2.

**Riesgos / invalidación:**
- Sin UX de cash-out creíble, el proyecto se percibe como “otra wallet crypto”.
- Compliance bancario bloquea liquidación real en el plazo del bootcamp (mitigar con demo sandbox + roadmap).
- Si el equipo vuelve a “solo transparencia de ONG”, se pierde la fibra del músico.
- Competir mal contra Bre-B en cobros (inbound): por eso Orilla se mantiene en **payout**.

---

## Nota histórica (Entregable 1)

La versión original del brief priorizaba verificación de desembolsos de sponsors/apoyos (Carnaval, FSD, veeduría). Ese material de propuestas individuales permanece en `JoseMaza.md`, `CarlosPrimo.md`, `JesusBorrero.md`, `SergioMancilla.md`. El pivot no borra el aprendizaje: SDP sigue siendo el motor; cambia el **quién duele** y el **final feliz** (Bancolombia del trabajador).
