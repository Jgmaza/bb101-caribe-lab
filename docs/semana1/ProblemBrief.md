# Problem Brief

## Decisión del problema

### Problema elegido

> El problema ganador en una frase, sin mencionar blockchain, y quién lo propuso.

Cuando una fundación, sponsor o programa local reparte apoyos a muchas personas, beneficiarios y veedores no pueden verificar de forma independiente quién recibió cuánto y cuándo. **Propuesto por José Maza.**

### Por qué elegimos este

> Qué inclinó al equipo por este problema frente a los demás, según los criterios de la Sesión 1.

Priorizamos un caso con **movimiento real de valor** y varias partes que no se confían entre sí (sponsor, operador, beneficiario, veedor) y necesitan el **mismo registro** de pagos. Encaja de forma natural con la Stellar Disbursement Platform (herramienta oficial para pagos masivos), tiene prior art en Colombia (transparencia de desembolsos on-chain) y permite un MVP demostrable en pocas semanas. Remesas, pesca y obras son problemas reales, pero implican más fricción regulatoria, oráculos físicos o riesgo de quedar en un dashboard sin liquidación.

### Propuestas descartadas

> Cada propuesta considerada, quién la propuso y el motivo del descarte.

1. **Remesas Atlántico → comercio local** (Carlos Primo): problema fuerte y muy “Stellar”, pero el MVP depende de anclas reguladas y cash-out real; lo aparcamos como posible fase 2.
2. **Pesca artesanal + liquidación** (Jesús Borrero): alto impacto Caribe; sin escrow de pago el caso se reduce a trazabilidad QR (una DB podría bastar). Requiere operación en playa/acopio difícil en 5 semanas.
3. **Transparencia de obras públicas** (Sergio Mancilla): evidencia local sólida (contratación / veeduría), pero sin liberación de pagos el valor se parece a un tablero sobre datos ya públicos (SECOP).

### Cómo tomamos la decisión

> Cómo llegó el equipo al acuerdo: votación, consenso tras debate u otro.

**Consenso provisional** ante el deadline del Entregable 1, liderado por la investigación de opciones A–D y la viabilidad de Demo Day. Queda sujeto a **ratificación** del equipo cuando todos aporten commit propio y feedback. El nombre de producto y el piloto (Carnaval / FSD / otro sponsor) pueden ajustarse sin cambiar el problema central.

---

## Problem Brief

### Encabezado

> Nombre del proyecto y una frase que describa el problema. Extensión: breve.

**PagoClaro** — Hacer verificables, uno a uno, los desembolsos de apoyos locales a beneficiarios y veedores en el Caribe colombiano.

### Equipo y roles

> Integrantes con su usuario de GitHub, rol asumido por cada persona, responsable de las entregas y canal de coordinación interna. Extensión: breve.

| Integrante | GitHub | Rol provisional |
|---|---|---|
| José Maza | Jgmaza | Responsable de entregas, docs y coordinación |
| Carlos Primo | TBD | Research / producto (propuesta remesas) |
| Jesús Borrero | TBD | Research / campo (propuesta pesca) |
| Sergio Mancilla | TBD | Frontend / UX (propuesta obras) |

Canal interno: por definir (chat del bootcamp / WhatsApp del equipo). Los usuarios TBD se actualizarán con commits de cada integrante.

### Problema y evidencia

> Enunciado del problema en una frase, sin mencionar blockchain. Contexto, frecuencia y alcance. Evidencia mínima de que el problema existe: observación directa, experiencia propia, conversaciones o fuentes consultadas, con enlace o cita cuando aplique. Extensión: 150–300 palabras.

**Problema:** los apoyos económicos locales se pagan sin que la ciudadanía o el propio beneficiario puedan auditar fácilmente cada desembolso.

En Barranquilla, programas de Carnaval y fundaciones fortalecen a hacedores con kits, formación y recursos (p. ej. alianzas Fundación Santo Domingo–Carnaval; cohortes de inclusión financiera con cientos de créditos y horas de acompañamiento). El Carnaval 2025 reportó una derrama cercana a los $880.000 millones y más de 150 aliados comerciales, lo que implica muchos flujos de dinero hacia producción cultural y comunidad — hoy conciliados de forma opaca para el externo. A escala departamental, la Contraloría ha señalado proyectos críticos o “elefantes blancos” por cientos de miles de millones en Atlántico, lo que refuerza la demanda ciudadana de verificación, no solo de narrativa. El patrón se repite en microapoyos: lista en Excel, transferencia o efectivo, informe PDF. La frecuencia es recurrente en cada convocatoria o temporada (Carnaval, cohortes FSD, ayudas distritales). Alcance inicial: un piloto de decenas de beneficiarios en Barranquilla; potencial de extensión a otros programas del Caribe. Fuentes consultadas: La República (derrama Carnaval 2025), sitios de Carnaval de Barranquilla y FSD, El Tiempo (Contraloría Atlántico), documentación Stellar Disbursement Platform y caso Providencia Onchain en el ecosistema Stellar.

### Usuario y actores

> Quién sufre el problema y qué necesita resolver. Cómo lo resuelve hoy y qué le cuesta en dinero, tiempo o esfuerzo. Demás actores que intervienen en el flujo, con el papel que cumple cada uno. Extensión: 150–300 palabras.

**Usuario primario:** el beneficiario (hacedor, emprendedor migrante o receptor de kit) necesita cobrar completo, a tiempo y con comprobante que pueda mostrar. Hoy depende del operador: espera, se desplaza, firma planillas y no tiene un recibo universal verificable; el costo es tiempo, incertidumbre y, a veces, dependencia de intermediarios no oficiales.

**Usuario secundario:** el sponsor o aliado que financia quiere saber que su aporte llegó a las personas correctas. Hoy recibe reportes agregados; el costo es riesgo reputacional y de auditoría.

**Actores:** (1) Sponsor / aliado comercial — aporta recursos; (2) Operador (Carnaval S.A.S., fundación, secretaría) — selecciona beneficiarios y ejecuta pagos; (3) Beneficiario — recibe el apoyo; (4) Veedor / auditor / periodista — exige transparencia; (5) Entidad financiera o canal de pago — liquida COP; (6) En la solución, ancla/wallet — puente a fiat si se usa Stellar. El problema de confianza no es solo técnico: operador y sponsor no pueden “demostrar” sin que el otro acepte su archivo privado.

### Flujo actual de valor

> Recorrido paso a paso de cómo se mueve hoy el dinero, la información o el activo, desde el origen hasta el destino. Diagrama o secuencia numerada, con los intermediarios explícitos. Señalar si algún paso responde a una obligación normativa. Extensión: 150–300 palabras.

1. Sponsor aprueba presupuesto o convenio con el operador.
2. Operador arma lista de beneficiarios (criterios del programa; puede haber obligaciones de KYC o registro interno).
3. Área financiera programa transferencias, giros o pagos en efectivo / caja.
4. Banco o canal de pago liquida a cuentas o puntos de retiro (normativa financiera y tributario-contable del operador).
5. Beneficiario cobra; firma planilla o soporte.
6. Operador consolida Excel + soportes y entrega informe al sponsor (PDF / reunión).
7. Veedor, si existe, pide información vía derecho de petición o canales del programa; no ve el pago unitario en tiempo real.

Intermediarios explícitos: operador, banco/canal de pago, a veces un tercero logístico de kits. El dinero y la “verdad” del pago viven en sistemas privados del operador; el sponsor solo ve el resumen.

### Fricciones identificadas

> Puntos concretos donde el flujo falla, se encarece o se demora. Cada fricción indica en qué paso ocurre, qué la causa y a quién afecta. Extensión: 150–300 palabras.

1. **Paso 3–4 (programación y liquidación):** errores de cuenta, rechazos o demoras; afecta al beneficiario (no cobra) y al operador (reprocesos).
2. **Paso 5 (cobro):** dependencia de efectivo o puntos físicos; costo de tiempo y riesgo de “gestores” informales; afecta al beneficiario.
3. **Paso 6 (reporte):** el informe es agregado y editable; el sponsor no puede verificar un pago puntual sin pedir más documentos; afecta sponsor y confianza pública.
4. **Paso 7 (veeduría):** asimetría de información; causa: no hay registro compartido; afecta ciudadanía y reputación del programa.
5. **Conciliación multi-actor:** cuando hay varios sponsors o lotes, cruzar “quién pagó qué” es manual y lento; afecta operador y auditoría.

La fricción priorizada es la **imposibilidad de verificación unitaria independiente** (pasos 6–7), porque concentra la confianza en el operador y es la que más duele a sponsors y Demo Day.

### Oportunidad e hipótesis

> Oportunidad priorizada entre las fricciones identificadas, con el motivo de la elección. Hipótesis inicial de por qué blockchain podría mejorar ese punto, expresada en términos de qué cambiaría para el usuario. Extensión: 150–300 palabras.

**Oportunidad:** publicar cada desembolso como pago verificable en un registro compartido, sin sustituir la decisión de a quién se le da el apoyo.

**Hipótesis:** si el operador dispersa con SDP sobre Stellar y cada receiver tiene una wallet (o cash-out vía ancla), entonces el beneficiario obtiene un comprobante universal, el sponsor abre un explorador y ve “pago #17 = hash X”, y el veedor deja de depender del PDF. Para el usuario, cambia de “me dijeron que me pagaron” a “puedo mostrar la transacción”. Elegimos esta fricción porque (a) mueve valor, (b) no requiere oráculo físico complejo, (c) usa stack documentado por SDF, (d) tiene referente colombiano.

### Criterio de pertinencia

> Justificación de por qué el caso requiere un registro distribuido y no una base de datos tradicional o una integración entre sistemas existentes. Debe apoyarse en al menos uno de los criterios de la Sesión 1: varias partes que no confían entre sí necesitan compartir un mismo registro, el histórico no puede alterarse, o se elimina un intermediario que hoy concentra la confianza. Extensión: 150–300 palabras.

Una base de datos del operador sigue siendo **su** verdad: el sponsor y el veedor deben confiar en que no se reescribió. Integrar bank APIs mejora eficiencia, pero no da a terceros un comprobante neutral. Aquí **varias partes que no confían entre sí** (sponsor ≠ operador ≠ beneficiario ≠ veedor) necesitan el mismo histórico de pagos y que ese histórico **no sea alterable** a posteriori. El ledger público (o al menos compartido e inmutable) cumple ese criterio; el operador deja de ser el único dueño del registro. No afirmamos que blockchain detecte fraude off-chain (listas falsas); sí afirmamos que, una vez ejecutado el pago on-chain, la prueba ya no depende del Excel. Por eso una DB tradicional no basta para la promesa de verificación independiente.

### Supuestos y riesgos

> Dos o tres supuestos que tendrían que ser ciertos para que la hipótesis funcione, y qué podría invalidarla. Extensión: 150–300 palabras.

**Supuestos:**
1. Existe un operador dispuesto a piloto (Carnaval, FSD u otro) o, en el bootcamp, un escenario simulado creíble con datos ficticios.
2. Los beneficiarios pueden usar wallet simple o un flujo de cobro asistido (SEP-24 / ancla) sin fricción extrema.
3. El sponsor valora la transparencia unitaria lo suficiente como para aceptar USDC/testnet en la demo.

**Riesgos / invalidación:**
- Sin pagador real ni simulación seria, el proyecto se percibe como dashboard vacío.
- Regulación o compliance del operador impide usar rails crypto en producción (el MVP de aula puede quedarse en testnet).
- Si las listas de beneficiarios son fraudulentas *antes* del pago, el ledger solo registra el fraude con más claridad — no lo evita; haría falta gobernanza off-chain.
- El equipo no ratifica D y vuelve a remesas/pesca/obras: el brief se actualizaría, pero la estructura del repo ya soporta el cambio.
