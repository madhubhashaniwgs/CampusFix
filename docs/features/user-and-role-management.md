# User & Role Management

## Roles

| Role | Registration | Access |
|---|---|---|
| student | self-service, active immediately | own issues, report, profile |
| staff | self-service → `pending`, or admin-created → active | assigned issues only |
| admin | seeded (`npm run seed:admin`) or promoted | everything + user/staff/audit/analytics management |

## Staff approval flow

1. Staff registers (`role:'staff'`) → `status:'pending'`, login blocked (403).
2. Admin lists pending via `GET /api/admin/users?role=staff&status=pending`.
3. `PATCH /api/admin/staff/:id/approve` or `/reject`.
4. Rejected accounts cannot be approved; approving active is a safe no-op.

Admin can also create staff directly: `POST /api/users/staff`
(body: fullName, email, password, staffId, department) → active immediately.

## Security notes

- Role is forced server-side (`staff` for staff routes); body `role` ignored.
- `tokenVersion` bumps on logout/password-change invalidate all sessions.
- Staff status changes emit `staff:*` realtime events + admin notifications.
