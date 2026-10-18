# Challenge #4 — MAKE IT HAPPEN

**Bootcamp:** Blockchain Builders 101 · Semana 4  
**Producto:** Orilla (Caribe Lab)  
**Deadline:** domingo 9:00 p. m. (Colombia)  
**Entrega video:** Instagram + tag `@thebafnetwork` · form https://forms.gle/CQvWL6jQWb2iW8Uf7  
**Premio:** mejor video → $40 USD  
**Requisitos IG:** seguir `@thebafnetwork` en Instagram y X

---

## Mensaje original (WP)

> ¡Hola, builders!  
> Llegamos a la semana 4 de Blockchain Builders 101.  
> La semana pasada vimos cómo se ven sus productos. ¡Ahora queremos verlos en acción!
>
> **CHALLENGE #4: MAKE IT HAPPEN**  
> Esta semana integrarán sus contratos o tecnologías del track de integración del SCF en el frontend, con el backend necesario.
>
> **EL RETO**  
> Creen un video de máximo 60 segundos mostrando una funcionalidad real de su producto, pero de forma creativa.
>
> **Su video debe mostrar:**
> - Qué necesita hacer su usuario.
> - Cómo utiliza su producto.
> - Qué acción ya funciona gracias a su integración.
> - Qué resultado obtiene.
>
> ¡Nada de tutoriales técnicos ni pitches tradicionales!  
> Pueden hacerlo como un comercial, POV, mini historia o simulación de uso real. Lo importante es mostrar una integración que realmente funcione, aunque el producto todavía esté en desarrollo.

---

## Estado actual (honestidad técnica)

| Pieza | Hoy |
|---|---|
| Front Orilla | ✅ UI completa (pagador + cobrar) en Vercel |
| Datos | ❌ Mock (`frontend/src/lib/mock.ts`) |
| SDP / contrato / pago testnet | ❌ No conectado (Entregable 3 dejó esto para semana 4) |
| Comprobante / hash | ❌ Hash ficticio; link a stellar.expert genérico |

**Implicación:** el video del reto **no puede** basarse solo en el mock. Hay que cablear **al menos una acción real on-chain (testnet)** visible en el flujo.

---

## Qué debe demostrar el video (checklist del reto)

| Beat | En Orilla |
|---|---|
| Qué necesita el usuario | Cobrar el show la misma noche / cerrar el lote del hotel |
| Cómo usa el producto | App Orilla (mobile músico o desktop pagador) |
| Qué acción ya funciona por la integración | Pago / registro on-chain en testnet (tx real) |
| Qué resultado obtiene | “Te pagaron $X” + comprobante con hash verificable / éxito cash-out UX |

---

## Ruta de integración recomendada (para ganar el video)

Arquitectura del Blueprint = **opción B (SDP)**. Para el reto de 60s, SDP completo es pesado. Propuesta pragmática:

### Camino A — **Pago Stellar clásico en testnet** (recomendado para deadline)

1. Backend o route Next.js firma/envía un **payment** real en testnet (USDC test o XLM) al cerrar lote o al “activar” el cobro del músico.  
2. Front deja de usar hash mock: muestra **tx hash real** + link `stellar.expert/explorer/testnet/tx/...`.  
3. El video enseña el happy path músico; en un corte se ve el explorador / hash.

**Pros:** rápido, SDK conocido, se ve “plata moviéndose”.  
**Contras:** no es SDP todavía (sí es integración SCF/Stellar válida).

### Camino B — **Smart contract Soroban** (si quieren destacar “contratos”)

1. Contrato mínimo: `registrar_pago(receptor, monto)` o escrow simple.  
2. Deploy testnet + invoke desde front/API.  
3. Comprobante muestra contract ID + tx.

**Pros:** encaja con “aprendimos smart contracts” del contenido IG.  
**Contras:** más setup; el usuario final no “ve” el contrato (hay que mostrarlo con cuidado, sin tutorial).

### Camino C — SDP

Ideal de producto a medio plazo; **no** como único path si el domingo es hard deadline sin instancia SDP lista.

**Decisión provisional:** Camino A para el video; B opcional en paralelo si hay tiempo; C post-reto.

---

## Concepto creativo de video (≤60s)

### Concepto ganador propuesto: **POV “bajé del escenario”**

Formato: POV / mini historia. Sin pitch. Sin “hola somos el equipo”.

| Tiempo | Plano | Qué se ve |
|---|---|---|
| 0–8s | Manos guardando baquetas / congas, luz de hotel, texto sutil o nada | Acaba el show. Antes: “te pago la otra semana”. |
| 8–18s | Celular: SMS/link Orilla o abre `/cobrar/...` | Necesita cobrar ya. |
| 18–35s | Flujo app: OTP → **Te pagaron $450.000** → Enviar a Bancolombia | Usa Orilla. |
| 35–50s | Confirmación + **hash / stellar.expert** un segundo (prueba de integración) | La acción on-chain funcionó. |
| 50–60s | Cierre: “Listo” / plata en banco (UX) + logo Orilla | Resultado. |

Alternativa B (si graban dos): **split screen** hotel cierra lote en desktop ↔ músico recibe en el lobby.

**Audio:** ambiente show + notificación; poca voz o una línea (“¿ya me pagaron?”).  
**Caption IG:** tono más técnico (promesa del post 01) — ver `CAPTION-RETO4.txt` cuando exista.

---

## Plan de trabajo (hasta domingo)

| Día | Qué |
|---|---|
| Hoy–vie | Elegir Camino A o B; cablear pago/invoke testnet; quitar hash mock en comprobante |
| Sáb | Ensayar flujo en prod/preview; grabar POV + screen record |
| Dom am | Editar ≤60s; publicar IG; form; anotar link en `docs/metricas/Puntos-bootcamp.md` |

### Roles sugeridos

| Quién | Rol |
|---|---|
| José | Integración + coords + edit |
| Sergio | Front UX + grabación músico / screen |
| Carlos / Jesús | Guion beats + apoyo grabación / form |

---

## Entregables de esta carpeta

- [x] Este brief (`Challenge-4-Make-It-Happen.md`)
- [ ] Spec técnica de la integración elegida (`Integracion-testnet.md`)
- [ ] Guion shot-by-shot (`Guion-video-60s.md`)
- [ ] Caption IG del reto
- [ ] Link del post + form enviados

---

*Semana 4 · Caribe Lab · Orilla*
