# Audit Logging

Append-only `AuditLog` records for accountability. Writes are **best-effort**:
`auditService.record()` validates against allowlists and never throws — a failed
audit write cannot break a business operation, and failed business ops never
produce audit records.

## Events

`user.registered`, `user.login`, `user.logout`, `user.password_changed`,
`staff.created`, `staff.approved`, `staff.rejected`,
`issue.created`, `issue.assigned`, `issue.status_changed`, `issue.photo_uploaded`.

Actor = authenticated user (anonymous supported for registration).
Metadata is allowlist-filtered — no passwords, JWTs, CSRF tokens, or bodies.
No-op actions (same-staff assign, already-in-state approve/reject) record nothing.

## API — `GET /api/admin/audit-logs` (admin only)

Query: `page`, `limit` (≤100), `action`, `actorId`, `targetType`,
`startDate`, `endDate`. Newest-first, DB-level pagination, safe projection.

Frontend: `/admin/audit-logs` page with filters, pagination, readable labels,
responsive layout. Realtime: `audit:new` events refresh the open view.
