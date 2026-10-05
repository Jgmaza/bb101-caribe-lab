# Historias de usuario individuales

**Nombre:** Carlos Primo

**Usuario de GitHub:** Carlosprimo

---

## Mis historias de usuario

> Producto: **Orilla** — pagos rápidos a economía informal / eventos.

1. Como **productora de eventos** quiero **cargar la lista del staff y pagar los montos acordados en un lote** para **cerrar el evento sin hacer transferencias una por una**.
2. Como **proveedor informal de una feria** quiero **cobrar el mismo día que entrego** para **no financiar al organizador con mi inventario**.
3. Como **pagador** quiero **usar montos en pesos (o equivalentes claros)** para **no confundir al equipo con monedas que no entiende**.
4. Como **trabajador** quiero **recibir un SMS con el enlace al pago de mi evento** para **consultar el monto y su estado desde mi celular**.
5. Como **hotel** quiero **reutilizar plantillas de lista (músicos, técnicos, seguridad)** para **armar el lote del próximo show en minutos**.
6. Como **tesorería** quiero **exportar el resumen del lote (pagados / fallidos)** para **cuadrar con mi contabilidad interna**.
7. Como **organizador** quiero **pagar a personas que aún no tienen cuenta bancaria vía wallet primero** para **incluir staff que hoy solo cobra en efectivo**.

## La más importante y por qué

| Orden de importancia | Historia # | Por qué |
| :---: | :---: | --- |
| 1 (la más importante) | #1 | Permite pagar al equipo de una vez, siempre que el pagador tenga fondos suficientes. |
| 2 | #4 | El enlace permite consultar el pago; recibir la invitación no significa que ya le pagaron. |
| 3 | #2 | Extiende el valor más allá del músico: ferias y proveedores. |
| 4 | #7 | Inclusión financiera real del staff en efectivo. |
| 5 | #3 | Reduce fricción de comprensión (pesos primero). |
| 6 | #5 | Acelera operación recurrente (hoteles / productoras). |
| 7 (la menos importante) | #6 | Necesario para adopción B2B, pero no bloquea el demo del happy path. |

## Criterios de aceptación de mis dos historias del backlog

### Historia #1 → [US-3: Dispersión de lote](https://github.com/Jgmaza/bb101-caribe-lab/issues/3)

- La demo permite cargar al menos cinco personas con nombre, celular, monto y rol, y revisar el total antes de enviar.
- Si los fondos no alcanzan para el lote, se informa cuánto falta y no se permite lanzarlo.
- Cada pago completado tiene una referencia de transacción en Stellar testnet.

### Historia #4 → [US-5: Invitación por SMS o enlace](https://github.com/Jgmaza/bb101-caribe-lab/issues/5)

- El enlace lleva al registro por celular y luego al pago del evento correspondiente.
- Si se envía la invitación antes de completar el pago, se muestra como pendiente. “Te pagaron” aparece cuando se confirma la transferencia a la wallet.
- Para la demo se puede compartir el enlace directamente si todavía no hay envío real de SMS.
