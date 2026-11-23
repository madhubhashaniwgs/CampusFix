# Feature Overview

## Issue management

Students create issues (`POST /api/issues`) with title, description, category
(electrical/plumbing/it/furniture/other), location, priority, optional photo.
Ticket IDs are `CF-` + 8 hex chars with collision retry.

Lifecycle: `reported` → `assigned` → `in_progress` → `resolved` (or `rejected`).
Every transition appends to `statusHistory[]`. Admins assign/reassign staff;
same-staff reassignment is a no-op (no duplicate history/audit/events).
Lists are paginated (10/page) with status/priority/category/search filters.

See [issue-management.md](issue-management.md), [photo-upload.md](photo-upload.md).

## User & role management

- **Student:** self-registers, active immediately.
- **Staff:** self-registers as `pending` (login blocked) or admin-created (active).
  Admin approves/rejects via `/api/admin/users` + `/api/users/staff`.
- **Admin:** seeded via `npm run seed:admin` or promoted manually.

See [user-and-role-management.md](user-and-role-management.md).

## Notifications & email

Persistent `Notification` docs per user: created on issue report (to reporter),
assignment (reporter + assignee), status change (reporter), staff approve/reject
(the staff member). APIs: list, unread-count, mark read, mark-all read.
Emails go through `emailService` → Resend HTTPS API; without `RESEND_API_KEY`
they log to console (dev mode). Delivery failure never breaks the business op.

See [notifications-and-email.md](notifications-and-email.md).

## Real-time

Socket.IO on the same HTTP server; see [realtime-system.md](realtime-system.md).

## Audit logging

Append-only `AuditLog` records for auth, staff, and issue events — allowlisted
actions/metadata, best-effort writes, admin-only read API + UI page.
See [audit-logging.md](audit-logging.md).

## Analytics

`GET /api/admin/analytics` powers 5 Recharts on the admin dashboard:
status/priority/category distributions, monthly reported-vs-resolved trends
(resolved counted by latest `statusHistory.resolved` entry), staff workload
(total + active, top 20, deterministic order).
See [analytics.md](analytics.md).
