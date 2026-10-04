# Lean Canvas — Orilla

**Enlace canónico (para el blueprint):** este archivo en el repo.  
**Producto:** Orilla — *Que quien trabaja hoy, cobre hoy.*

---

## 1. Problema

1. Trabajadores informales / de eventos esperan días o semanas para cobrar un trabajo ya hecho.
2. Pagadores (hotel, productora) liquidan uno a uno (Excel + transferencias) con errores y reclamos.
3. El efectivo en cierres de evento es riesgoso y sin comprobante claro.

**Alternativas actuales:** transferencia bancaria tardía, efectivo, Nequi uno a uno, “te pago el lunes”.

---

## 2. Segmentos de clientes

- **Usuario héroe:** músicos, staff, vendedores de feria / proveedores informales (Caribe colombiano).
- **Pagador (buyer):** hoteles, productoras, organizadores de Carnaval/ferias/conciertos.
- **Early adopters:** productoras medianas y hoteles con shows recurrentes en Barranquilla.

---

## 3. Propuesta de valor única

**Trabajé hoy → cobré hoy → plata en Bancolombia.**  
Dispersión masiva al cierre del evento + cash-out simple al banco que ya usa el trabajador. No pedimos que “entienda crypto”.

---

## 4. Solución

1. Lista/lote del pagador → pagos masivos (Stellar / SDP).
2. Wallet on-demand + notificación al celular.
3. Botón “Enviar a Bancolombia” (off-ramp a COP).
4. Comprobante por persona (fin al “¿ya te pagué?”).

---

## 5. Canales

- Productoras y asociaciones de eventos / músicos.
- Pilotos con hoteles y ferias locales.
- Demo Day bootcamp + contenido “economía informal”.
- Boca a boca en staff de Carnaval y nightlife.

---

## 6. Ingresos

- Fee por lote o % bajo por pago dispersado (B2B al pagador).
- Fee de cash-out (compartido con ancla/partner) — fase posterior.
- Plan SaaS para productoras con eventos recurrentes (fase 2).

---

## 7. Costos

- Desarrollo app pagador + app/flujo trabajador.
- Hosting SDP / backend + fees de red (bajos en Stellar).
- Partner off-ramp / compliance.
- Soporte operativo en pilotos.

---

## 8. Métricas clave

- Tiempo trabajo→dinero usable (días → minutos).
- % del lote pagado exitoso en la primera corrida.
- % que completa cash-out a Bancolombia (≤ 4 taps).
- Reclamos “no me pagaron” por evento.
- NPS del trabajador y del pagador en piloto.

---

## 9. Ventaja diferencial

- Enfocado en **payout informal/eventos**, no en cobros de mostrador (Bre-B/Tap to Pay).
- Final feliz local: **Bancolombia** (y rails COP), no quedarse en wallet.
- Historia con fibra + stack Stellar de dispersión masiva.
- Comprobante compartido sin depender del Excel del hotel.

---

## Vista lienzo (una página)

```text
┌─────────────────┬──────────────────────┬─────────────────────┐
│ PROBLEMA        │ SOLUCIÓN             │ PROPUESTA ÚNICA     │
│ Pago tardío     │ Lote masivo          │ Trabajé hoy →       │
│ Excel + 1 a 1   │ Wallet on-demand     │ cobré hoy →         │
│ Efectivo riesg. │ Cash-out Bancolombia │ Bancolombia         │
├─────────────────┼──────────────────────┼─────────────────────┤
│ MÉTRICAS        │ VENTAJA              │ CANALES             │
│ Tiempo a COP    │ Payout ≠ cobro POS   │ Productoras/hoteles │
│ % lote OK       │ Fibra + Stellar      │ Carnaval/ferias     │
│ % cash-out      │ Comprobante real     │ Demo / boca a boca  │
├─────────────────┴──────────────────────┴─────────────────────┤
│ SEGMENTOS: músico/staff (héroe) · hotel/productora (buyer)   │
├──────────────────────────────┬───────────────────────────────┤
│ COSTOS: build, SDP, off-ramp │ INGRESOS: fee lote / SaaS B2B │
└──────────────────────────────┴───────────────────────────────┘
```
