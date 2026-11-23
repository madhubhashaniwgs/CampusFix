# Environment Variables

Source of truth: `server/.env.example` and `client/.env.example`. Never commit `.env`.

## server/.env

| Variable | Required | Purpose |
|---|---|---|
| `PORT` | yes | API port (default 5000) |
| `NODE_ENV` | yes | `development` / `test` / `production` |
| `MONGODB_URI` | yes | MongoDB connection string |
| `JWT_SECRET` | yes | Signs auth JWTs |
| `JWT_EXPIRES_IN` | yes | Token lifetime |
| `CSRF_SECRET` (or signing secret) | yes | HMAC-signs CSRF tokens |
| `CLIENT_ORIGINS` | yes | Comma-separated CORS allowlist (incl. Socket.IO) — never `*` with credentials |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | seed only | Initial admin for `npm run seed:admin` |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | optional | Photo uploads; missing → uploads unavailable |
| `RESEND_API_KEY` | optional | Real email; missing → dev-mode console logging |
| `EMAIL_FROM` | optional | Verified sender for Resend |
| `CLIENT_URL` | optional | Links inside email templates |

## client/.env

| Variable | Required | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | yes | Backend API base, e.g. `http://localhost:5000/api` |
| `VITE_API_URL` | optional | Socket.IO origin, e.g. `http://localhost:5000` (falls back to localhost:5000) |

## Notes

- Tests rewrite `MONGODB_URI` to the `campusfix_test` database automatically.
- `CLIENT_ORIGINS` must include the exact frontend origin (e.g. `http://localhost:5173,5174`).
