# Security Overview

## Authentication

- JWT stored in `campusfix_token` **httpOnly** cookie (Secure + SameSite in prod).
- `Authorization: Bearer` fallback for API clients.
- `tokenVersion` on User invalidates all tokens on logout/password change.
- `isActive=false` or pending/rejected staff cannot authenticate.
- Socket.IO handshake re-validates the same JWT + tokenVersion.

## CSRF

Double-submit pattern: signed `csrf_token` cookie + `X-CSRF-Token` header,
HMAC-verified server-side. All mutating cookie-auth requests require it.

## Authorization

`authorize('student'|'staff'|'admin')` middleware per route; role never trusted
from client input. Issue lists are server-scoped (student→own, staff→assigned,
admin→all).

## Other controls

- Password policy enforced on register/staff-create (min length).
- Login/register/upload endpoints rate-limited (429 + headers).
- Input validation via dedicated validators; consistent ApiError responses
  (no stack traces).
- Cloudinary uploads use signed upload tokens bound to the user; server derives
  public IDs; orphan cleanup on failed issue creation.
- AuditLog records are append-only, allowlisted metadata, secret-free.
- Analytics/audit endpoints admin-only; responses exclude passwords/tokens.
- Email/notification payloads contain no secrets.

## Production requirements

- `NODE_ENV=production`, HTTPS, `Secure` cookies, tight `CLIENT_ORIGINS`.
- Real `JWT_SECRET`/`CSRF_SECRET` (long random), Resend + verified sender domain.
- Socket.IO needs WebSocket-capable hosting; single-node only today.
