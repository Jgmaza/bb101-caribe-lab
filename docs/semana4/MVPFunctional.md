# Entregable 4 — MVP Functional · Orilla

**Equipo:** bb101-caribe-lab (Caribe Lab)  
**Producto:** Orilla — *Que quien trabaja hoy, cobre hoy.*  
**Repositorio:** [Jgmaza/bb101-caribe-lab](https://github.com/Jgmaza/bb101-caribe-lab)  
**Deadline Apex:** 19 oct 2026, 23:00 COT  
**Decisión E3 (opción B):** tecnología del ecosistema Stellar — pagos nativos (Horizon/SDK) + ancla SEP-24; SDP queda como motor de escala para lotes grandes. El MVP hotel usa **Excel → lotes → cerrar la noche**; los grupos con % y `/pagar/[slug]` son un atajo secundario.

---

## Evidencia verificable (abrir y comprobar)

| Qué | Enlace |
|---|---|
| **Producto en línea** | https://orilla-dusky.vercel.app |
| **Video del MVP (≤3 min)** | https://github.com/Jgmaza/bb101-caribe-lab/raw/main/docs/semana4/video-mvp-orilla.mp4 |
| **Pago a proyecto (testnet)** | https://stellar.expert/explorer/testnet/tx/28b1a1b88e1188f28ae8a75c08ad71eca22de0c0870feef80d1a29a160192ec3 |
| **Reparto a integrantes (testnet)** | https://stellar.expert/explorer/testnet/tx/bd6cc1f86c3fc33a4dbdf1f8a6db84498a88e659bb68c939299e28f44c3d0e06 |
| **Recarga friendbot → wallet (testnet)** | https://stellar.expert/explorer/testnet/tx/54aa546ce882f9e4b425cf17b264c50b439ed85c4c3b50ec4cd57e83a998f751 |

**Qué hace la integración:** un usuario paga en XLM (UI en pesos) a la cuenta del proyecto; Orilla reparte en una transacción a las wallets custodiales de los integrantes; el retiro puede ir a otra wallet o a un banco de prueba vía ancla SEP-24 (`testanchor.stellar.org`). No hay contrato Soroban propio: es opción B (ecosistema).

**Recorrido en producción:** `/registro` → `/ingresar` → `/inicio` → `/proyectos/nuevo` → `/pagar/[slug]` → recibo con enlaces al explorador → `/retirar`.

---

## Aprendizajes y ajustes priorizados

Esta semana aprendimos que el mock del Entregable 3 no basta para demostrar valor en Stellar: sin una tx real, el video y Apex no se sostienen. También vimos que montar SDP completo (tenants, Demo Wallet, claim SEP-24) es potente pero frágil para un deadline corto; el equipo priorizó un flujo de **proyectos con % + pago/reparto nativo en testnet**, que cumple la promesa “un pago, muchos cobran” y deja evidencia pública en el explorador.

Ajustes por impacto/esfuerzo: (1) auth con username + sesión y una wallet por persona — alto impacto, ya hecho; (2) pagos en XLM con UI en pesos y recarga automática — alto impacto, ya hecho; (3) retiros a wallet y ancla de prueba — medio-alto, ya hecho; (4) alinear Vercel con el código de `main` — crítico para evaluadores, hecho el 19 oct; (5) documentación y video de entrega — bloqueante Apex, este archivo + video.

Antes del cierre: publicar este doc, el video y asegurar Apex. Pendiente post-cierre: cash-out Bancolombia real, OTP/SMS productivos, y decidir si se retoma SDP para lotes masivos hotel→staff.

*(≈220 palabras)*

---

## Riesgos y pendientes

**Riesgos técnicos.** Las cuentas custodiales dependen de `ORILLA_ENCRYPTION_KEY`: rotarla invalida wallets existentes. Friendbot y Horizon testnet pueden fallar por DNS/IPv6 en algunos entornos (mitigado con `ipv4first`). La tasa XLM→COP (CoinGecko) es referencia de mainnet; en testnet solo sirve para UX. El ancla SEP-24 de prueba no es Bancolombia: demostrar “banco” en demo puede generar expectativa incorrecta si no se aclara.

**Riesgos de producto.** El usuario héroe (músico/staff) aún no valida el flujo nuevo frente al mock hotel/cobrar del E3; hay riesgo de fricción con username/contraseña y con jerga si se filtra “XLM/wallet”. Vercel y el repo pueden desalinear de nuevo si los deploys automáticos fallan por permisos de autor de commit.

**Pendientes antes / justo al cierre.** Video en redes + form del Challenge #4 (≤60s, aparte del video Apex ≤3 min). Commits individuales de todos los integrantes esta semana. Registro/carga en Apex. Capturas y guion POV actualizados al flujo `/pagar` + `/retirar`. Post-cierre: off-ramp COP, invitaciones sin cuenta previa, y métricas de tiempo-a-cobro.

*(≈260 palabras)*

---

## Plan de validación con usuarios

**A quiénes.** Usuario del Problem Brief: músicos y staff de eventos/hoteles en el Caribe (Barranquilla y zona), más un pagador tipo tesorería de hotel o productora. Secundario: encargado de reparto porcentual (comparsas / Carnaval).

**Métodos.** (1) Pruebas moderadas de 20–30 min con el producto en testnet: crear proyecto, pagar un show simbólico, ver recibo y explorador, intentar retiro de prueba. (2) Entrevistas cortas post-uso (5 preguntas) sobre confianza, claridad de “saldo” vs banco, y si pagarían comisión por cobrar la misma noche. (3) Métrica proxy en demo day: tiempo desde “Pagar” hasta ver hash en stellar.expert; objetivo &lt; 60 s en condiciones normales de red.

**Hipótesis.** H1: el trabajador entiende “te pagaron” sin jerga crypto. H2: el pagador prefiere un solo pago con % fijos frente a N transferencias. H3: ver el explorador aumenta confianza aunque el cash-out a Bancolombia aún sea sandbox.

**Criterio de éxito.** ≥4/5 participantes completan el happy path sin ayuda en el paso de pago; ≥3/5 dicen que cobrarían así “esta noche” si el banco fuera real; el pagador completa un reparto sin errores de % (suma 100%). Si fallan H1 o H2, priorizamos copy y simplificación de `/inicio` y `/retirar` antes de nuevas features.

*(≈270 palabras)*

---

## Mapa técnico (resumen)

| Pieza | Dónde |
|---|---|
| Front + server actions | `frontend/` (Next.js 16) |
| Schema / RLS | `supabase/schema.sql` |
| Stellar (pago, reparto, friendbot, retiros) | `frontend/src/lib/server/stellar.ts`, `payment-flow.ts`, `withdrawal-flow.ts`, `anchor.ts` |
| Plan de producto | `docs/producto/Plan-MVP-testnet.md` |

---

*Caribe Lab · Semana 4 · Blockchain Builders 101*
