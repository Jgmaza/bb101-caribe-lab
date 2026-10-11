# Orilla — frontend

## Requisitos

- Node.js 20 o superior
- npm 10 o superior

## Instalación

```bash
cd frontend
npm install
```

## Cómo correrlo

```bash
cd frontend
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

Demo en producción: [https://orilla-dusky.vercel.app](https://orilla-dusky.vercel.app)

- Pagador (desktop): `/pagador/login`
- Staff / músico (mobile): `/cobrar/laura` — OTP mock `4821`
- Donaciones Carnaval SA: `/pagador/lotes/carnaval`

Build de producción:

```bash
cd frontend
npm run build
npm start
```
