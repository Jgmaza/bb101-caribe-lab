# Orilla — frontend

## Requisitos

- Node.js 20 o superior
- npm 10 o superior
- Docker (Postgres Orilla + más adelante SDP)

## Instalación

```bash
# Postgres Orilla
docker compose up -d

cd frontend
npm install
cp .env.example .env   # si no existe
npx prisma migrate dev
npm run db:seed
```

## Cómo correrlo

```bash
cd frontend
npm run dev
```

Abrir [http://localhost:3030](http://localhost:3030) (3000 lo reserva SDP).

Demo en producción: [https://orilla-dusky.vercel.app](https://orilla-dusky.vercel.app)

- Pagador (desktop): `/pagador/login` — correo + código mock `4821`
  - Ejemplo Dann: `tesoreria@danncarlton.test`
  - Ejemplo Carnaval: `donaciones@carnaval.test`
- Staff / músico (mobile): `/cobrar/laura` — OTP mock `4821`
- Donaciones Carnaval SA: `/pagador/lotes/carnaval`

### API (Fase 0–2, en construcción)

| Método | Ruta | Qué hace |
|---|---|---|
| POST | `/api/auth/login` | Cookie de sesión pagador |
| POST | `/api/auth/logout` | Cierra sesión |
| GET | `/api/auth/me` | Sesión actual |
| GET | `/api/lotes` | Lotes de la org |
| GET | `/api/lotes/:id` | Detalle |
| POST | `/api/lotes/:id/cerrar` | Cierra noche (aún sin SDP) |

Plan app real: [`docs/semana4/Arquitectura-app-real.md`](docs/semana4/Arquitectura-app-real.md)

Build de producción:

```bash
cd frontend
npm run build
npm start
```
