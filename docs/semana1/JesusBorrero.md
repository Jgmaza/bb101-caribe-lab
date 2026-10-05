# Propuesta individual — Kova

**Nombre:** Jesús Borrero

**Usuario de GitHub:** jesubohr

---

## Decisión del problema

### Problema elegido

Los desarrolladores no tienen una forma simple de cobrarle a un agente de IA por cada llamada a su API. Suscripciones, tarjetas y API keys están hechas para humanos, no para máquinas que pagan centavos miles de veces.

### Por qué elijo este

Los agentes ya consumen APIs solos, pero no pueden registrarse ni poner una tarjeta. Stellar soporta x402 y MPP, dos protocolos para pagar dentro de la misma petición HTTP. Kova los convierte en producto: SDK, dashboard de precios y cobro en USDC por llamada. El MVP es demostrable: un agente paga 0,001 USDC y el pago aparece en el dashboard.

### Propuestas descartadas o aparcadas

1. **Construir un facilitador x402 propio:** descartado. Un estudio de USENIX Security encontró fallas de seguridad en los 15 facilitadores analizados, incluido Coinbase.
2. **Ir horizontal desde el inicio:** aparcado. El mercado es temprano; conviene validar con un solo vertical.

### Cómo tomé la decisión

Tres filtros: (1) ¿hay pago real en cada interacción?, (2) ¿Stellar aporta algo que una base de datos privada no?, (3) ¿se puede demostrar en testnet en pocas semanas? Kova cumple los tres.

---

## Problem Brief

### Encabezado

**Kova** — Que cualquier API cobre por llamada a agentes de IA, en USDC sobre Stellar.

### Equipo y roles

| Integrante | GitHub | Rol provisional |
|---|---|---|
| Jesús Borrero | jesubohr | Research técnico, arquitectura y SDK |

### Problema y evidencia

**Problema:** cobrarle a un agente por llamada, a escala de centavos y sin intervención humana, no tiene una herramienta simple.

Evidencia (mediados de 2026):
- x402 suma más de 165M de transacciones y 480K agentes únicos.
- El volumen real diario ronda USD 28.000; cerca de la mitad es tráfico de prueba.
- Stellar ya tiene facilitador x402 (OpenZeppelin) y SDK de MPP (`@stellar/mpp`).

La infraestructura existe, pero falta una capa de producto para el desarrollador.

**Alcance MVP:** un endpoint protegido en testnet, un agente que paga por llamada y un dashboard con la transacción.

### Usuario y actores

**Usuario primario:** desarrollador con una API (datos, inferencia, herramientas MCP) que quiere cobrar por uso a agentes.

**Usuario pagador:** agente de IA, o su dueño, que necesita pagar sin registrarse y con límites de gasto.

**Actores:** desarrollador, agente, Kova (SDK + router + dashboard), facilitador OpenZeppelin (solo x402), red Stellar.

### Flujo actual de valor

1. El desarrollador publica la API.
2. Un humano se registra, pone tarjeta y recibe una API key.
3. El consumo se mide en la base de datos del proveedor.
4. El procesador de tarjetas cobra a fin de mes y liquida días después.
5. En una disputa, solo existen los logs del proveedor.

### Fricciones identificadas

1. **Registro humano obligatorio (paso 2):** el agente no puede usar un servicio recién descubierto.
2. **Comisiones fijas de tarjeta (paso 4):** hacen inviable cobrar por llamada.
3. **Liquidación lenta (paso 4):** el desarrollador espera días.
4. **Medición opaca (pasos 3 y 5):** el pagador depende de los logs del proveedor.
5. **Sin límites de gasto:** el agente no tiene tope programable.

**Fricción priorizada:** el agente no puede pagar por llamada, al momento, sin un humano.

### Oportunidad e hipótesis

**Oportunidad:** un middleware que responde HTTP 402 con el precio, recibe el pago firmado en el reintento y liquida en USDC sobre Stellar.

**Hipótesis:** si el desarrollador instala el SDK y fija un precio, el agente puede descubrir, pagar y usar la API en una sola interacción, sin registro. El desarrollador recibe el pago en segundos.

**Decisiones clave:** soportar x402 y MPP (sesiones para alta frecuencia); usar el facilitador hospedado de OpenZeppelin; testnet por defecto.

### Criterio de pertinencia

Desarrollador y agente no se conocen ni se confían. Stellar deja prueba de cada pago que ninguno puede reescribir. Además elimina al intermediario (tarjeta + facturación). Una base de datos privada no le da al agente forma de verificar qué pagó.

### Supuestos y riesgos

**Supuestos:**
1. Hay desarrolladores dispuestos a cobrar por llamada en USDC.
2. Los agentes aceptan una wallet Stellar con límites de gasto.
3. El facilitador de OpenZeppelin y `@stellar/mpp` son estables en testnet.

**Riesgos:**
- **Competencia:** Cloudflare ofrece x402 sin fees extra; Natural levantó USD 30M. Kova se diferencia por foco en Stellar, MPP y experiencia de desarrollador.
- **Mercado temprano:** si no hay demanda real, la hipótesis cae. Mitigar con un piloto en un solo vertical.
- **Seguridad:** hay ataques documentados de “compras sin pago” y abuso de gas. Mitigar con infraestructura auditada y topes de gas.
- **Wallets:** el soporte de MPP es menos maduro que el de x402.
