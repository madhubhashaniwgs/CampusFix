# API Reference

Base URL: `/api`. Auth: `campusfix_token` httpOnly cookie (or `Authorization: Bearer`).
Mutating requests require `X-CSRF-Token` header matching the `csrf_token` cookie.
All responses use `{statusCode, success, message, data}`.

## Auth — `/api/auth`

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/register` | public (rate-limited) | body: fullName, email, password, role?, staffId?, department? → student or pending staff |
| POST | `/login` | public (rate-limited) | sets auth + csrf cookies; pending/rejected staff → 403 |
| POST | `/logout` | authenticated | bumps tokenVersion, disconnects sockets |
| GET | `/me` | authenticated | current user profile |
| GET | `/csrf` | public | issues signed CSRF token + cookie |
| POST | `/change-password` | authenticated | bumps tokenVersion → other sessions invalidated |

## Issues — `/api/issues`

| Method | Path | Role | Notes |
|---|---|---|---|
| POST | `/` | student | create issue; optional `photoPublicId` from upload token |
| GET | `/` | any auth | paginated list, scoped by role; filters: status, priority, category, search, page, limit |
| GET | `/staff` | admin | staff members for assignment dropdown |
| GET | `/:id` | owner/staff-assigned/admin | issue detail + statusHistory |
| PATCH | `/:id/assign` | admin | body: staffId; same-staff = no-op |
| PATCH | `/:id/status` | assigned staff/admin | permitted transitions only |
| POST | `/upload` | any auth (rate-limited) | multipart image → Cloudinary signed upload |

## Users — `/api/users`

| Method | Path | Role | Notes |
|---|---|---|---|
| POST | `/staff` | admin | create staff account (active immediately) |

## Admin — `/api/admin`

| Method | Path | Notes |
|---|---|---|
| GET | `/users` | paginated user list; filters role, status, search |
| PATCH | `/staff/:id/approve` | approve pending staff |
| PATCH | `/staff/:id/reject` | reject pending staff |
| GET | `/audit-logs` | paginated; filters action, actorId, targetType, startDate, endDate |
| GET | `/analytics` | charts data; params: months(1-24), startDate, endDate |

## Notifications — `/api/notifications`

| Method | Path | Notes |
|---|---|---|
| GET | `/` | own notifications; params page, limit, unreadOnly |
| GET | `/unread-count` | `{count}` |
| PATCH | `/:id/read` | mark one read |
| PATCH | `/read-all` | mark all read |

## Errors

Consistent `{success:false, message, errors[]}` with proper status codes:
400 validation, 401 unauthenticated, 403 forbidden, 404 not found, 429 rate-limited.
