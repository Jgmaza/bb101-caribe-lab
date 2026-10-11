# Instrucciones para el equipo — Entregable 3 (Orilla)

José ya dejó la base del **Functional Proof** en el repo  
[bb101-caribe-lab](https://github.com/Jgmaza/bb101-caribe-lab): front en `frontend/`, diseño Pen en `frontend/orilla.pen`, documentación en `docs/semana3/Documentacion.md` y README solo de ejecución.

Cada uno necesita **mínimo 1 commit propio** esta semana (evidencia de participación para Apex). El repo de Apex es el mismo GitHub: con el push basta.

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

Abrir http://localhost:3000

| Rol | Ruta | Nota |
| --- | --- | --- |
| Pagador | `/pagador/login` | Demo Dann Carlton |
| Staff | `/cobrar/laura` | OTP mock: `4821` |
| Carnaval % | `/pagador/lotes/carnaval` | Idea de valor fase 2 |

---

## Qué SÍ pueden editar

### Carlos Primo (`Carlosprimo`)

- `frontend/src/app/pagador/lotes/page.tsx` — copy operativo (subtítulos, labels de tabla)
- `frontend/src/app/pagador/lotes/nuevo/page.tsx` — textos de carga CSV / preview
- `docs/semana3/Documentacion.md` — solo la fila de **Participación** de Carlos (confirmar revisión del flujo pagador)

Mensaje sugerido: `docs: ajuste copy operativo del panel pagador`

### Jesús Borrero (`jesubohr`)

- `frontend/src/app/cobrar/[token]/pago/page.tsx` — tono “Te pagaron” / saldo Orilla (sin jerga crypto)
- `frontend/src/app/cobrar/[token]/page.tsx` — copy del onboarding OTP
- `docs/semana3/Documentacion.md` — solo la fila de **Participación** de Jesús

Mensaje sugerido: `ux: afina copy del saldo Orilla para staff`

### Sergio Mancilla (`athomserx`)

- `frontend/src/components/ui.tsx` — botones, chips, espaciado
- `frontend/src/components/MobileShell.tsx` o `Logo.tsx` — pulido visual menor
- Cualquier pantalla bajo `frontend/src/app/cobrar/` — accesibilidad / espaciado mobile
- `docs/semana3/Documentacion.md` — solo la fila de **Participación** de Sergio

Mensaje sugerido: `feat: pulido UI del flujo cobrar`

---

## Qué NO deben editar / tocar

| No tocar | Por qué |
| --- | --- |
| `README.md` | Apex pide que solo tenga requisitos, instalación y cómo correrlo |
| `docs/semana3/Documentacion.md` secciones 1, 2 y 4 | Front, decisión técnica B (SDP) y bloqueos ya cerrados; solo editen su fila en Participación |
| Borrar pantallas o rutas del MVP | Rompe el entregable |
| `frontend/next.config.ts` / dependencias mayores | Riesgo de romper el build |
| Contratos / SDP real / backend | Fuera del Entregable 3 (semana siguiente) |
| Cambiar la decisión técnica a opción A | El equipo ya eligió SDP (opción B) |
| Morado / look Nequi-Nu / jerga crypto en el staff | Marca Orilla: blanco + Caribe (azul/verde/arena) |
| Commitear `node_modules/`, `.env`, `.DS_Store` | Basura / secretos |

---

## Cómo hacer el commit

```bash
git checkout main
git pull origin main
# edita SOLO tu archivo asignado
git add <archivo>
git status   # revisa que no entren node_modules ni .DS_Store
git commit -m "tu mensaje"
git push origin main
```

Si `main` está protegido o hay conflicto: avisen a José antes de forzar nada.

---

## Checklist personal

- [ ] Corrí el front en local y vi mi cambio
- [ ] Un solo commit propio (o pocos, claros)
- [ ] No toqué el README ni borré flujos
- [ ] Avisé en el grupo cuando hice push

Copia espejo en el repo: `docs/semana3/Instrucciones-commits-equipo.md`
