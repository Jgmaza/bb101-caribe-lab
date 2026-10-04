# Historias de usuario individuales

**Nombre:** Sergio Mancilla

**Usuario de GitHub:** athomserx

---

## Mis historias de usuario

> Producto: **Orilla** — pagos rápidos a economía informal / eventos.

1. Como **pagador** quiero **corregir un número de celular erróneo antes de lanzar el lote** para **evitar pagos que nadie puede reclamar**.
2. Como **pagador** quiero **recibir una advertencia si hay datos incompletos o inconsistentes en la lista antes de lanzar** para **corregir los errores antes de mover el dinero**.
3. Como **pagador** quiero **confirmar el resumen final del lote antes de enviarlo** para **verificar destinatarios, montos y cantidad de pagos antes de autorizar la operación**.
4. Como **trabajador** quiero **saber qué hacer si mi pago queda pendiente o falla** para **poder resolver el problema sin depender de mensajes al coordinador**.
5. Como **trabajador** quiero **volver a acceder al enlace de mi pago desde mi celular** para **consultar su estado aunque no haya abierto la notificación inmediatamente**.
6. Como **pagador** quiero **identificar rápidamente qué pagos fallaron y cuáles se completaron** para **reprocesar únicamente los casos problemáticos**.
7. Como **diseñador / producto** quiero **que el flujo mobile-first funcione en redes lentas** para **que sirva en el cierre del evento en sitio**.

## La más importante y por qué

|   Orden de importancia  | Historia # | Por qué                                                                                                                                         |
| :---------------------: | :--------: | ----------------------------------------------------------------------------------------------------------------------------------------------- |
|  1 (la más importante)  |     #3     | Previene errores antes de que se mueva el dinero y agrega una capa crítica de confianza al lanzamiento del lote.                                |
|            2            |     #1     | Evita pagos enviados a un número equivocado, reduciendo errores difíciles de recuperar.                                                         |
|            3            |     #4     | Cubre el momento problemático que aparece cuando el happy path falla y evita que el trabajador quede sin saber qué hacer.                       |
|            4            |     #6     | Permite recuperar errores de forma operativa sin repetir todo el lote.                                                                          |
|            5            |     #2     | Reduce errores de datos antes de ejecutar la dispersión y facilita el trabajo del pagador.                                                      |
|            6            |     #5     | Hace más robusto el acceso al pago cuando el trabajador pierde o ignora inicialmente la notificación.                                           |
| 7 (la menos importante) |     #7     | Es un requisito no funcional importante para el contexto de eventos, pero guía la implementación más que representar una feature independiente. |
