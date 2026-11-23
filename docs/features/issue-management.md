# Issue Management

Students report campus issues; staff resolve them; admins coordinate.

## Lifecycle

`reported` → `assigned` → `in_progress` → `resolved` / `rejected`

- `statusHistory[]` records every transition (status, updatedBy, note, updatedAt).
- Ticket IDs: `CF-` + 8 uppercase hex chars, generated with collision retry.
- Assignment: admin-only; same-staff reassignment is a no-op.
- Status updates: assigned staff or admin; invalid transitions rejected.

## Listing

`GET /api/issues` — paginated (default 10), role-scoped:
- student → own issues (`reportedBy`)
- staff → assigned issues (`assignedTo`)
- admin → all issues

Filters: `status`, `priority`, `category` (comma-separated), `search`
(ticketId/title/description, regex-escaped), `page`, `limit`.
Indexes on `{reportedBy,createdAt}`, `{assignedTo,createdAt}`, `{createdAt}`.

## Realtime & notifications

Issue events (`issue:created`, `issue:assigned`, `issue:status_changed`)
emit to relevant rooms after commit; reporter/assignee get persistent
notifications + emails. See [realtime-system.md](realtime-system.md).
