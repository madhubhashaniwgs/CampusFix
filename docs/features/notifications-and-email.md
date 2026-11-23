# Notifications & Email

## Persistent notifications

`Notification` model: `{userId, type, title, message, issueId, read, createdAt}`.
Indexes on `userId` and `userId+read+createdAt`.

Created server-side only, recipients derived from trusted business data
(populated `reportedBy`/`assignedTo`/staff records) — never client input.

| Event | Recipient(s) |
|---|---|
| Issue reported | reporter |
| Issue assigned/reassigned | reporter + new assignee |
| Status → in_progress/resolved | reporter |
| Staff approved/rejected | that staff member |

No duplicates on no-op operations (same-staff reassign, already-in-state).

## API — `/api/notifications` (authenticated)

- `GET /` — own notifications, paginated (`page`, `limit`, `unreadOnly`)
- `GET /unread-count` — `{count}`
- `PATCH /:id/read` — mark one
- `PATCH /read-all` — mark all

Frontend: `NotificationBell` in `AppLayout` — badge, dropdown, mark read/all,
realtime `notification:*` events, click navigates to the issue.

## Email — `server/src/services/emailService.js`

Resend-compatible HTTPS API via native `fetch` (no SDK dependency).
Branded HTML + plain-text templates; links use `CLIENT_URL`.

- Without `RESEND_API_KEY`: safe dev mode — logs recipient+subject, sends nothing.
- `send()` catches all provider errors → returns `false`; awaited at
  post-success points; **never breaks the business operation**.
- No emails for failed ops or no-ops; no secrets in content/logs.

Env: `RESEND_API_KEY`, `EMAIL_FROM` (verified sender), `CLIENT_URL`.
