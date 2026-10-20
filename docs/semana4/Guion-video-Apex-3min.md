# Guion + pitch — Video Apex (≤ 3 min)

**Producto:** Orilla · Caribe Lab  
**URL demo:** https://orilla-dusky.vercel.app  
**Excel:** https://orilla-dusky.vercel.app/Lote-pagos-Orilla-demo.xlsx  
**Formato:** horizontal 16:9 (1280×720 o 1920×1080) — evaluadores en laptop  
**Duración objetivo:** **2:00 – 2:30** (máx. 3:00)  
**Tone:** claro, humano, sin tutorial de blockchain

> Este es el video **obligatorio de Apex**.  
> El de IG ≤60s es otro (`Guion-video-60s.md`).

---

## Pitch en una frase (memorízala)

> **Orilla hace que un hotel pague a músicos y staff la misma noche — con su Excel de siempre — y cada persona ve “Te pagaron” y puede pasar la plata a su banco. Hoy corre en Stellar testnet con USDC de verdad.**

Si te trabas, di solo eso y corta a pantalla.

---

## Pitch hablado (~45–55 s) — léelo natural, no de robot

*(Cámara a ti, o voz en off sobre pantalla. Habla como si se lo explicaras a un amigo.)*

> En los eventos del Caribe, quien toca o trabaja de noche casi nunca cobra esa misma noche. El hotel tiene el Excel… y el pago se demora.
>
> **Orilla** es eso: la empresa sube su lista, ve quién recibe cuánto, cierra la noche — y cada persona abre la app y ve **Te pagaron**.
>
> No es un mock. Movemos **USDC en Stellar testnet**. El trabajador puede pasar a un banco de prueba. La clave Stellar la administra Orilla: el usuario solo ve pesos y confianza.
>
> Tagline: **Que quien trabaja hoy, cobre hoy.**

**Tips al leerlo**
- Una idea por frase. Pausa 1 segundo entre párrafos.
- No digas “blockchain”, “smart contract”, “Horizon”, “SEP-24”.
- Sí puedes decir una vez: “en la red Stellar, testnet” cuando muestres el comprobante.

---

## Estructura del video (shot list)

| # | Tiempo | Qué se ve | Qué dices / audio | Notas |
|---|--------|-----------|-------------------|--------|
| 1 | 0:00–0:20 | Tú (cara o bust) o título “Orilla” + tagline | Pitch párrafo 1–2 | Luz de frente; mira la cámara |
| 2 | 0:20–0:50 | Screen: login `danncarlton` → `/lotes/nuevo` | “La empresa sube el Excel…” | Zoom al botón Subir |
| 3 | 0:50–1:20 | Screen: interpretación (@usuario vs recibe) | “Orilla muestra quién recibe cuánto” | Quédate 3 s en la lista |
| 4 | 1:20–1:50 | Screen: **Cerrar la noche** → éxito + link tx | “Cierra la noche — pago real en testnet” | Abre stellar.expert 2–3 s |
| 5 | 1:50–2:20 | Screen: logout → login `laura` → **Te pagaron** | “El músico / staff ya ve el pago” | Hero shot |
| 6 | 2:20–2:40 | Screen: Pasar a mi banco (prueba) o comprobante | “Puede pasar a su banco” | No hace falta completar KYC largo |
| 7 | 2:40–2:55 | Tú o logo + tagline | Pitch cierre / tagline | Fade out |

Si vas corto: corta el bloque 6. Si vas largo: no improvises; recorta el pitch inicial.

---

## Cuentas y clicks (ensaño 1 vez en silencio)

1. Incógnito / ventana limpia → https://orilla-dusky.vercel.app  
2. Empresa: `danncarlton` / `OrillaHotel2026!` → Soy empresa → Nuevo lote  
3. Sube `Lote-pagos-Orilla-demo.xlsx` (ya descargado)  
4. Nombre del lote: `Lobby Dann · demo Apex`  
5. Confirmar → mira interpretación → **Cerrar la noche** (espera; puede tardar por USDC/swap)  
6. Cerrar sesión → `laura` / `OrillaStaff2026!` → Vengo a cobrar → **Te pagaron**  
7. Abre el pago / comprobante → stellar.expert  

**Plan B si “Cerrar la noche” falla en vivo:** ten una captura o clip previo del éxito + un hash de tx ya guardado (el smoke USDC del doc). Di: “este es el comprobante de una corrida de hace unos minutos”.

---

## Cómo grabarlo si no eres bueno en cámara

### Antes (10 min)
1. Cierra Slack, WhatsApp, notificaciones macOS.  
2. Escritorio limpio; solo Chrome con Orilla.  
3. Zoom del navegador **110–125%** para que se lea.  
4. Auriculares + mic del Mac o AirPods (mejor que el mic del monitor).  
5. Ensaya el pitch **2 veces en voz alta** con el cronómetro. No memorices palabra por palabra: memoriza las 4 ideas.

### Grabar en 2 pistas (más fácil que todo a la vez)
1. **Pista A — voz:** QuickTime o Voice Memos. Lee el pitch sentado. Si te equivocas, pausa y repite la frase (luego cortamos).  
2. **Pista B — pantalla:** QuickTime → Nueva grabación de pantalla → solo la ventana de Chrome. **Sin hablar.** Haz el flujo despacio (clicks claros, 2 s de pausa en cada pantalla importante).  
3. Luego en Cursor pedimos a **Kinocut** juntar voz + pantalla, recortar y exportar ≤3 min.

### Si prefieres todo junto
- QuickTime pantalla + mic.  
- Habla poco mientras navegas; deja el pitch al inicio y al final.  
- Si te trabas: **cállate, respira, sigue** — se edita.

### Qué NO hacer
- Explicar Stellar 30 segundos.  
- Mostrar `.env`, claves, ni “S…” secrets.  
- Leer el README en cámara.  
- Apurarte en “Cerrar la noche” (la espera se ve bien si dices “la red confirma…”).

### Checklist de calidad
- [ ] Se lee el texto de la UI  
- [ ] Se ve **Te pagaron** con monto  
- [ ] Se ve un hash / stellar.expert ≥ 2 s  
- [ ] Audio sin eco fuerte  
- [ ] Duración ≤ 3:00  
- [ ] Empieza con el problema, no con “hola somos el equipo”

---

## Texto para YouTube (descripción)

```
Orilla — Que quien trabaja hoy, cobre hoy.

Demo MVP (Blockchain Builders 101 / Caribe): un hotel sube su Excel,
cierra la noche y el staff ve “Te pagaron”. Pagos en USDC sobre Stellar testnet.

App: https://orilla-dusky.vercel.app
Repo: https://github.com/Jgmaza/bb101-caribe-lab
Doc: docs/semana4/MVPFunctional.md

Equipo: Caribe Lab (bb101-caribe-lab)
```

**Visibilidad:** Sin listar → copias el link → reemplazas `VIDEO_URL` en `MVPFunctional.md`.

---

## Después de grabar (edición con Kinocut)

1. Guarda los archivos en algo como:  
   `~/Movies/Orilla-Apex/`  
   - `pantalla.mov`  
   - `voz.m4a` (o todo-en-uno `toma1.mov`)
2. En Cursor Agent:  
   *“Con Kinocut, junta voz + pantalla, recorta a ~2:20, normaliza audio, exporta mp4 1080p a docs/semana4/video-mvp-orilla.mp4”*
3. Sube a YouTube → pega URL en `VIDEO_URL`.

Kinocut ya está en tu `~/.cursor/mcp.json` (doctor: `required_ok: true`).
