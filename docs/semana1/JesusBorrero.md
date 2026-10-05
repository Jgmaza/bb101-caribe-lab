# Propuesta individual — Kova

**Nombre:** Jesús Borrero

**Usuario de GitHub:** jesubohr

> Fuente principal: investigación técnica de Kova (protocolos x402 y MPP sobre Stellar, seguridad de facilitadores, competencia y mercado). Las cifras de mercado y competencia se citan tal como aparecen en esa investigación.

---

## Decisión del problema

### Problema elegido

Los desarrolladores que ofrecen APIs no tienen una forma simple de cobrarle a un agente de IA por cada llamada; los sistemas de cobro actuales (suscripciones, tarjetas, API keys con factura mensual) están hechos para humanos, no para máquinas que pagan centavos miles de veces.

### Por qué elijo este

Los agentes de IA ya consumen APIs de forma autónoma, pero no pueden registrarse, poner una tarjeta ni esperar una factura. Hoy el protocolo HTTP 402 (x402) y MPP permiten pagar dentro de la misma petición HTTP, y Stellar soporta ambos de forma nativa. Kova convierte eso en un producto para el desarrollador: un SDK, un dashboard de precios y cobro en USDC por cada llamada. Hay **movimiento real de valor** en cada request y el MVP es demostrable: un agente paga 0,001 USDC, recibe la respuesta y el pago aparece en el dashboard.

### Propuestas descartadas o aparcadas

1. **Pesca artesanal + liquidación (mi propuesta del Entregable 1):** alto impacto Caribe, pero el oráculo físico (registro del lote en playa) es difícil de validar en el plazo del bootcamp.
2. **Construir un facilitador x402 propio:** descartado. Un estudio presentado en USENIX Security encontró que los 15 facilitadores analizados (incluidos Coinbase y Thirdweb) violaban al menos una regla de seguridad.
3. **Ir horizontal desde el día uno (“todas las APIs, todos los agentes”):** aparcado. El mercado todavía está en fase de prueba; conviene validar con un solo vertical.

### Cómo tomé la decisión

Comparé el caso contra tres filtros: (1) ¿hay pago real en cada interacción?, (2) ¿Stellar aporta algo que una base de datos privada no puede?, (3) ¿se puede demostrar en testnet en pocas semanas? Kova cumple los tres. La investigación técnica también definió qué **no** construir (facilitador propio) y qué usar (infraestructura auditada de OpenZeppelin y el SDK oficial `@stellar/mpp`).

---

## Problem Brief

### Encabezado

**Kova** — Que cualquier API cobre por llamada a agentes de IA, en USDC sobre Stellar, con unas pocas líneas de código.

### Equipo y roles

| Integrante | GitHub | Rol provisional |
|---|---|---|
| Jesús Borrero | jesubohr | Proponente — research técnico, arquitectura y SDK |

Equipo completo por definir si la propuesta se adopta.

### Problema y evidencia

**Problema:** un desarrollador que quiere cobrarle a un agente de IA por cada llamada a su API no tiene una herramienta que funcione a escala de centavos y sin intervención humana.

Hoy, monetizar una API exige que un humano cree una cuenta, ponga una tarjeta y reciba una API key. Eso no encaja con un agente que descubre un servicio, lo usa una vez y sigue. Las tarjetas tienen comisiones fijas por transacción que hacen inviable cobrar fracciones de centavo. Además, el agente no puede esperar aprobación humana en cada paso.

Evidencia de partida (según la investigación):
- x402 acumula más de 165M de transacciones, unos USD 50M+ de volumen y más de 480K agentes únicos (mediados de 2026).
- El volumen real diario ronda los USD 28.000, y cerca de la mitad de la actividad se clasifica como “gamificada” (pruebas o tráfico artificial).
- Stellar ya soporta x402 (con el facilitador “Built on Stellar” de OpenZeppelin) y MPP (con `@stellar/mpp`), con comisiones de red muy bajas y finalidad de unos 5 segundos.

Lectura: la infraestructura ya existe, pero la adopción real es temprana. Hay espacio para una capa de producto centrada en el desarrollador.

**Alcance MVP:** un endpoint protegido en Stellar testnet, un agente de prueba que paga por llamada y un dashboard que muestra la transacción.

### Usuario y actores

**Usuario primario (héroe):** desarrollador o pequeño equipo que tiene una API útil (datos, inferencia, herramientas MCP) y quiere cobrar por uso a agentes. Hoy elige entre regalar el acceso, montar suscripciones que los agentes no pueden usar, o construir su propio sistema de pagos. El costo es tiempo de ingeniería, ingresos perdidos y riesgo de seguridad.

**Usuario pagador:** agente de IA (o el humano/empresa que lo controla) que necesita pagar por servicio sin registrarse en cada proveedor, con límites de gasto claros.

**Actores:**
1. **Desarrollador** — protege el endpoint y define el precio.
2. **Agente cliente** — llama al endpoint y firma el pago.
3. **Kova** — SDK servidor/cliente, router de protocolo (x402 / MPP) y dashboard.
4. **Facilitador** (solo x402) — OpenZeppelin “Built on Stellar”, verifica y liquida.
5. **Red Stellar** — liquida la transferencia de USDC (Soroban / SEP-41).
6. **Dueño del agente** — fija presupuestos y aprueba montos altos.

### Flujo actual de valor

1. El desarrollador publica una API.
2. Para cobrar, crea planes de suscripción o pide registro con tarjeta.
3. Un humano se registra, paga y obtiene una API key.
4. El agente usa esa key; el consumo se mide en una base de datos privada del proveedor.
5. A fin de mes, el procesador de tarjetas cobra y liquida días después.
6. Si hay disputa (“no hice esas llamadas”), solo existen los logs del proveedor.

Intermediarios: procesador de pagos, banco emisor, plataforma de facturación. El agente no puede participar sin un humano en el paso 3.

### Fricciones identificadas

1. **Registro humano obligatorio (paso 3):** el agente no puede empezar a usar un servicio que acaba de descubrir.
2. **Comisiones fijas de tarjeta (paso 5):** hacen inviable cobrar por llamada de bajo valor.
3. **Liquidación lenta (paso 5):** el desarrollador espera días para recibir el dinero.
4. **Medición opaca (pasos 4 y 6):** el pagador depende de los logs del proveedor para saber cuánto debe.
5. **Sin límites de gasto para agentes:** un agente con una tarjeta no tiene un tope programable por hora, por endpoint o por sesión.
6. **Riesgo de construir pagos propios:** los facilitadores x402 existentes tienen vulnerabilidades documentadas (compras sin pago, robo de activos, abuso de gas).

**Fricción priorizada:** el agente no puede pagar por llamada, al momento, sin intervención humana.

### Oportunidad e hipótesis

**Oportunidad:** un middleware que responde HTTP 402 con el precio, recibe el pago firmado en el reintento y liquida en USDC sobre Stellar. Para alto volumen, usar sesiones MPP (canal de pago con compromisos off-chain y un solo cierre on-chain).

**Hipótesis:** si el desarrollador instala el SDK de Kova y fija un precio por endpoint, entonces un agente puede descubrir, pagar y usar la API en una sola interacción HTTP, sin registro previo. El desarrollador recibe el pago en segundos y ve cada transacción en el dashboard.

**Decisiones clave del MVP:**
- Soportar x402 (compatibilidad) y MPP (alta frecuencia); MPP Session por defecto para agentes frecuentes.
- No construir facilitador propio: usar el facilitador hospedado de OpenZeppelin.
- Testnet por defecto; mainnet solo con activación explícita.

### Criterio de pertinencia

Desarrollador y agente **no se conocen ni se confían**: no hay contrato previo ni cuenta creada. Un registro compartido (Stellar) deja prueba de cada pago que ninguna de las partes puede reescribir. También se **elimina el intermediario** que hoy concentra la confianza (procesador de tarjetas + facturación). Una base de datos privada del proveedor no basta: el agente no tendría forma de verificar qué pagó, y el proveedor no tendría garantía de cobro antes de entregar el servicio.

### Supuestos y riesgos

**Supuestos:**
1. Existen desarrolladores dispuestos a cobrar por llamada en USDC.
2. Los agentes (o sus dueños) aceptan tener una wallet Stellar con USDC y límites de gasto.
3. El facilitador hospedado de OpenZeppelin y `@stellar/mpp` son estables en testnet durante el bootcamp.

**Riesgos / invalidación:**
- **Competencia fuerte:** Cloudflare Monetization Gateway ofrece x402 en el edge sin fees adicionales; Natural levantó USD 30M con wallets para agentes; Stripe y Mastercard también entran. Kova debe diferenciarse por profundidad en Stellar, MPP para alta frecuencia, opción auto-hospedable y experiencia de desarrollador.
- **Mercado temprano:** cerca de la mitad del volumen x402 es artificial. Si no hay demanda real, la hipótesis cae. Mitigar con un piloto en un solo vertical (datos, inferencia o servidores MCP).
- **Seguridad:** los ataques de “compras sin pago” y abuso de gas son reales. Mitigar con infraestructura auditada, topes de gas y conciliación.
- **Limitación técnica:** OpenZeppelin Relayer en Stellar solo soporta firmantes locales (no Vault ni KMS). Por eso el MVP usa el facilitador hospedado y no un relayer propio.
- **Soporte de wallets para MPP:** menos maduro que x402; puede limitar quién paga en la demo.
- **Pertinencia Caribe:** el caso es global, no local. Debo justificar por qué importa a desarrolladores de la región (por ejemplo, cobrar en USDC sin cuenta bancaria en el exterior). Es un supuesto por validar.

---

## Nota histórica (Entregable 1)

Mi propuesta original fue **pesca artesanal del Caribe**: registrar el lote al desembarco y liberar el pago (escrow) cuando el comprador confirma recepción, para reducir la dependencia del intermediario. Quedó aparcada por la dificultad del oráculo físico. Kova conserva la misma idea central — pago contra entrega verificable sin intermediario que concentre la confianza — pero en un entorno 100 % digital y demostrable.
