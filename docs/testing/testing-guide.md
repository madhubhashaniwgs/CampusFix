# Testing Guide

## Backend (Node.js test runner + MongoDB test DB)

```powershell
cd server
node --test --test-concurrency=1 "tests/**/*.test.js"   # recommended: sequential
npm test                                                # parallel glob
```

Test files:

| File | Covers |
|---|---|
| `api.test.js` | auth, CSRF, RBAC, issues, pagination, staff approval, audit events, email, analytics, bearer fallback |
| `audit.test.js` | AuditLog model/repository |
| `rateLimit.test.js` | rate limiter behavior |
| `realtime.test.js` | Socket.IO auth, rooms, notifications, logout disconnect |

Conventions: dedicated `campusfix_test` DB (auto-derived from `MONGODB_URI`),
`createUserDirect` helper, `loginAs`/`api` helpers, unique `@test.com` emails.
No real Cloudinary/Resend calls — providers are mocked or dev-mode.

## Frontend

No component test framework is configured. `npm run build` + `npm run lint`
are the available checks. (Decision: adding Vitest/RTL was evaluated but not
justified for this phase — see report.)

## Commands

See [setup.md](../development/setup.md#test) for the full list including
`format:check` and lint for both packages.
