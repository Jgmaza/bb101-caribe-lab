# Orilla — MVP y propósito

**Tagline:** Que quien trabaja hoy, cobre hoy.

**Propósito práctico:** acortar el tiempo entre “terminé el trabajo” y “tengo la plata en mi banco” para trabajadores de la economía informal y de eventos en el Caribe colombiano.

---

## El problema (sin blockchain)

Un músico toca en un hotel el viernes. El hotel “le paga en 15 días”.  
Un staff de Carnaval cierra a las 2 a.m. y cobra en efectivo… o espera la transferencia “cuando salga el giro”.  
Una vendedora de feria entrega mercancía y el organizador le dice “el lunes”.

Ese retraso no es un motivo contable: es **arriendo, mercado y transporte** que no pueden esperar. La economía informal no falla por falta de talento; falla porque el dinero llega tarde, opaco y a pedazos.

**Frase de fibra:**  
> “Yo ya trabajé. ¿Por qué mi plata sigue en la cuenta del hotel?”

---

## A quién salvamos (usuario héroe)

| Persona | Situación hoy | Qué quiere |
|---|---|---|
| Músico / artista | Hotel, bar, feria demora 1–2 semanas | Cobrar al terminar |
| Staff de evento | Carnaval, conciertos, logística | Pago la misma noche |
| Vendedor / proveedor informal | Lista Excel + transferencia manual | Recibo y cash-out fácil |
| Organizador / hotel / productora | Paga uno a uno, errores, reclamos | Dispersar un lote en minutos |

**Usuario héroe del pitch:** el músico (o staff) que termina su show y quiere ver el dinero en Bancolombia sin pedirle favores a nadie.

---

## Qué es Orilla (producto)

Orilla es la capa que permite a un pagador (hotel, productora, Carnaval, feria) **dispersar pagos a muchas personas a la vez**, y a cada trabajador **recibir en wallet y pasar a pesos en su banco** con un flujo simple.

No vendemos “SDP”. Vendemos: **pago masivo + llegada a Bancolombia**.

Infra bajo el capó (solo para el equipo):

1. **Dispersión masiva** → Stellar Disbursement Platform (o flujo equivalente).
2. **Recepción** → wallet Stellar (invitación SMS/email; sin conocimiento crypto).
3. **Salida a fiat** → cash-out a Bancolombia (ancla / partner / rail local).

---

## Flujo objetivo (fin a fin)

```text
1. Pagador (hotel / productora)
   → arma lista: nombre, celular, monto, rol
   → fondea y lanza el lote (“cerrar la noche”)

2. Orilla / SDP
   → paga a cada wallet en Stellar (establecoin)
   → deja comprobante por persona

3. Trabajador (músico / staff)
   → abre link / app
   → ve: “Te pagaron $XXX”
   → toca “Enviar a Bancolombia”
   → elige cuenta / llave → confirma

4. Cash-out
   → USDC (u asset) → COP en Bancolombia
   → el trabajador usa la plata como siempre
```

### Diagrama de valor

```text
Hotel / Evento          Orilla              Trabajador           Banco
     |                    |                      |                  |
     |-- lista + fondos ->|                      |                  |
     |                    |-- pago wallet ------>|                  |
     |                    |                      |-- retirar COP -->|
     |                    |                      |<-- COP disponible|
```

---

## Alcance del MVP (lo que pintamos como “listo”)

El MVP **no** es “salvar toda la economía informal”.  
El MVP es demostrar **un camino completo** con un caso emocional:

> Un músico (o 10 staff de un evento) recibe el pago en wallet  
> y lo manda a Bancolombia en pocos pasos.

### Incluido en MVP

| Pieza | Qué se construye | Criterio de demo |
|---|---|---|
| A. Pagador | UI o flujo para cargar lista (CSV/form) y lanzar lote | 5–20 receivers de prueba |
| B. Dispersión | SDP testnet (o script batch Stellar) | Cada pago con tx hash |
| C. Wallet receptor | Registro simple (celular + verificación) | Ve saldo y historial |
| D. Cash-out Bancolombia | Flujo UX “Enviar a mi banco” | Happy path hasta confirmación |
| E. Comprobante | Pantalla “Ya te pagaron” + enlace a explorador | El músico puede mostrarlo |

### Fuera del MVP (fase 2)

- Tap to Pay / cobro en punto de venta  
- Integración nativa Bancolombia producción (compliance real)  
- Multi-banco / Bre-B completo  
- Nómina recurrente corporativa  
- Panel público de veeduría (opcional CSR)

### Honestidad técnica del cash-out

En bootcamp, el rail a Bancolombia puede ser:

1. **Ideal demo:** ancla / partner SEP-24 que simule o liquida a cuenta colombiana.  
2. **MVP creíble en aula:** UX completa + mock o sandbox del off-ramp, dejando claro el partner real a integrar.  
3. **No bloquear el pitch** por regulación: el valor del producto es el flujo; el banco es la última milla.

Lo importante para Demo Day: **el trabajador entiende el botón “Bancolombia”** y el viaje se siente de 30 segundos, no de 2 semanas.

---

## Historia de demo (guion de 90 segundos)

1. **Antes:** “Soy músico. El hotel me paga a 15 días. Mientras tanto, yo ya gasté en transporte y ensayo.”  
2. **Acción:** el hotel sube la lista del show de hoy y lanza el pago.  
3. **Momento:** el músico recibe SMS → abre → “Te pagaron $180.000”.  
4. **Cierre:** toca “Enviar a Bancolombia” → ve confirmación.  
5. **Frase:** “Trabajé hoy. Cobré hoy. La plata está en mi cuenta.”

---

## Por qué Stellar (para el jurado / sin decir SDP al público)

| Capacidad | Beneficio al usuario |
|---|---|
| Pagos masivos baratos y 24/7 | Cerrar la noche sin cola bancaria |
| Wallet on-demand | No necesita “saber de crypto” |
| Comprobante en red | “Me pagaron” deja de ser promesa |
| Stablecoin + off-ramp | Llega a pesos en el banco que ya usa |

Criterio Sesión 1: hotel/productora, trabajador y (a veces) intermediario de pago **no se confían entre sí**; el registro compartido del pago reduce “me lo debes” vs “ya te pagué”.

---

## Métricas de éxito del MVP

1. Tiempo percibido: de **días/semanas → minutos** (demo).  
2. Pasos del trabajador hasta Bancolombia: **≤ 4 taps**.  
3. Lote demo: **≥ 10 pagos** en una sola corrida.  
4. Tasa de “entendí qué pasó” en prueba con 3 usuarios reales ≥ 2/3.

---

## Nombre y posicionamiento

- **Orilla** se mantiene como nombre de equipo/producto.  
- Posicionamiento nuevo: **pagos para la economía informal de eventos**, no “transparencia de sponsors”.  
- Transparencia queda como subproducto (cada pago tiene hash), no como promesa principal.

**Pitch de una línea:**  
Orilla hace que músicos, staff y trabajadores de evento cobren al terminar — y manden su plata a Bancolombia sin esperar dos semanas.
