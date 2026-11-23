# Setup & Installation

## Prerequisites

- Node.js 20+ and npm
- MongoDB Atlas cluster (or local MongoDB)
- Cloudinary account (optional — photo uploads)
- Resend account (optional — real email delivery)

## Install

```powershell
# Backend
cd F:\Documents\MyProjects\CampusFix\server
npm install
copy .env.example .env    # then edit values

# Frontend
cd F:\Documents\MyProjects\CampusFix\client
npm install
copy .env.example .env    # VITE_API_BASE_URL=http://localhost:5000/api
```

## Configure `server/.env`

See [environment-variables.md](environment-variables.md). Required minimum:
`MONGODB_URI`, `JWT_SECRET`, `CSRF_SECRET` (or equivalent secret vars),
`CLIENT_ORIGINS` including your frontend origin.

Optional: `npm run seed:admin` creates the first admin from `ADMIN_*` vars.

## Run

```powershell
cd server ; npm run dev     # API + Socket.IO on :5000
cd client ; npm run dev     # Vite on :5173 (or next free port)
```

Frontend reads `VITE_API_BASE_URL` (default `http://localhost:5000/api`);
sockets connect to `VITE_API_URL` (default `http://localhost:5000`).

## Test

```powershell
cd server
npm test                                  # all tests
node --test --test-concurrency=1 "tests/**/*.test.js"   # sequential (recommended)
node --test tests/api.test.js             # single file
npm run format:check

cd client
npm run build
npm run format:check
npm run lint
```
