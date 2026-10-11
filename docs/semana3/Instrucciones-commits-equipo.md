# Instrucciones equipo — Entregable 3 (Orilla)

**Para:** Carlos Primo, Jesús Borrero, Sergio Mancilla  
**De:** José Maza  
**Repo:** https://github.com/Jgmaza/bb101-caribe-lab  
**Demo:** https://orilla-dusky.vercel.app  

José ya subió el front + docs. Cada uno necesita **mínimo 1 commit propio** esta semana (Apex = mismo repo GitHub).

---

## Asignación por nombre

| Nombre | GitHub | Qué hace |
| --- | --- | --- |
| **Carlos Primo** | `Carlosprimo` | Copy del panel pagador (lotes / nuevo lote) |
| **Jesús Borrero** | `jesubohr` | Copy del flujo staff (“Te pagaron” / OTP) |
| **Sergio Mancilla** | `athomserx` | Pulido UI mobile / componentes |
| José Maza | `Jgmaza` | Base ya hecha (no hace falta otro commit de ustedes) |

---

## Setup rápido

```bash
git clone https://github.com/Jgmaza/bb101-caribe-lab.git
cd bb101-caribe-lab
git pull origin main
cd frontend
npm install
npm run dev
```

Abrir http://localhost:3000 (o la demo Vercel arriba)

| Rol | Ruta | Nota |
| --- | --- | --- |
| Pagador | `/pagador/login` | Demo Dann Carlton |
| Staff | `/cobrar/laura` | OTP mock: `4821` |
| Carnaval % | `/pagador/lotes/carnaval` | Idea fase 2 |

---

## Qué SÍ editar

### 1) Carlos Primo — GitHub `Carlosprimo`

- `frontend/src/app/pagador/lotes/page.tsx` — copy operativo (subtítulos, labels)
- `frontend/src/app/pagador/lotes/nuevo/page.tsx` — textos CSV / preview
- `docs/semana3/Documentacion.md` — **solo tu fila** en Participación

Mensaje: `docs: ajuste copy operativo del panel pagador`

### 2) Jesús Borrero — GitHub `jesubohr`

- `frontend/src/app/cobrar/[token]/pago/page.tsx` — tono “Te pagaron” / saldo Orilla
- `frontend/src/app/cobrar/[token]/page.tsx` — copy onboarding OTP
- `docs/semana3/Documentacion.md` — **solo tu fila** en Participación

Mensaje: `ux: afina copy del saldo Orilla para staff`

### 3) Sergio Mancilla — GitHub `athomserx`

- `frontend/src/components/ui.tsx` — botones, chips, espaciado
- `frontend/src/components/MobileShell.tsx` o `Logo.tsx` — pulido menor
- Pantallas en `frontend/src/app/cobrar/` — mobile / accesibilidad
- `docs/semana3/Documentacion.md` — **solo tu fila** en Participación

Mensaje: `feat: pulido UI del flujo cobrar`

---

## Qué NO tocar

| No tocar | Por qué |
| --- | --- |
| `README.md` | Solo requisitos / install / cómo correrlo |
| `Documentacion.md` secciones 1, 2 y 4 | Ya cerradas; solo su fila de Participación |
| Borrar pantallas o rutas MVP | Rompe el entregable |
| `next.config.ts` / deps grandes | Puede romper el build |
| Contratos / SDP / backend | Semana siguiente |
| Cambiar decisión a opción A | Equipo eligió SDP (B) |
| Morado / look Nequi-Nu / jerga crypto | Marca Orilla Caribe |
| `node_modules/`, `.env`, `.DS_Store` | No van al repo |

---

## Cómo hacer el commit

```bash
git checkout main
git pull origin main
# edita SOLO tu archivo
git add <archivo>
git status
git commit -m "tu mensaje"
git push origin main
```

Conflicto o duda → avisen a **José Maza**.

---

## Checklist

- [ ] Corrí el front y vi mi cambio  
- [ ] Commit con **mi** usuario GitHub  
- [ ] No toqué README ni borré flujos  
- [ ] Avisé en el grupo cuando hice push  
