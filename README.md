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

Demo en producción: [https://orilla-dusky.vercel.app](https://orilla-dusky.vercel.app) (versión mock anterior; el MVP funcional necesita las variables de `frontend/.env.example` en Vercel)

- Grupo: `/proyectos/nuevo` — crea el proyecto con el % de cada integrante
- Organizador: `/pagar/[slug]` — un solo pago, se reparte al instante en Stellar testnet
- Integrante (mobile): `/cobrar` — busca por celular, OTP de prueba `4821`

Configuración de Supabase y Stellar: ver [`frontend/README.md`](frontend/README.md).

Build de producción:

```bash
cd frontend
npm run build
npm start
```
