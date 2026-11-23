# System Architecture

CampusFix is a **MERN** application structured as a modular monolith.

## Layers

```
React SPA (client/)  ──HTTP/JSON + Socket.IO──▶  Express API (server/)  ──▶  MongoDB Atlas
```

- **Presentation:** React 19 + Vite SPA. Pages under `src/pages/{auth,student,admin,staff}`,
  shared components under `src/components`, services under `src/services`,
  `AuthContext` for session state, `useRealtimeRefresh` hook for socket-driven refetches.
- **Application:** Express app in `server/src/app.js`. Routes → Controllers → Services →
  Repositories. Socket.IO attached to the same HTTP server in `src/socket/socketServer.js`.
- **Data:** MongoDB via Mongoose. Models: `User`, `Issue`, `Notification`, `AuditLog`.

## Backend module layout

```
server/src/
├── app.js                  # Express app, mounts routes + middleware
├── server.js               # HTTP listener + initSocket
├── config/                 # database connection
├── middleware/             # authMiddleware (JWT cookie/Bearer), csrf, rate limiters
├── models/                 # Mongoose schemas
├── repositories/           # DB access (incl. analyticsAggregations)
├── services/               # business logic (auth, issue, user, audit, notification,
│                           #   email, analytics)
├── controllers/            # thin HTTP handlers
├── routes/                 # auth, issue, user, admin, audit, notification
├── validators/             # request validation
├── socket/                 # Socket.IO server, rooms, emit helpers
└── utils/                  # ApiResponse, ApiError, cookieConfig
```

## Request flow

1. `authMiddleware` extracts JWT from `campusfix_token` httpOnly cookie (or `Authorization: Bearer`),
   verifies signature/expiry, loads user, checks `isActive` + `tokenVersion`.
2. `authorize(role)` enforces RBAC.
3. Validators sanitize input; controllers call services; services call repositories;
   responses use `ApiResponse` envelope `{statusCode, success, message, data}`.

## Real-time flow

Socket handshake reuses the same cookie JWT (signature, expiry, `isActive`,
`tokenVersion` re-validated). On connect the server joins the socket to
`user:{id}` and `role:{role}` rooms — clients cannot join arbitrary rooms.
Services emit **after** successful DB writes via `emitToUser`/`emitToRole`/`emitToRoles`
(best-effort, never throws). `logout`/`changePassword` bump `tokenVersion` and call
`disconnectUserSockets(userId)` so all tabs lose access immediately.

## Data stores

- `users` — accounts, roles, status (active/pending/rejected), tokenVersion
- `issues` — ticketId `CF-XXXXXXXX`, status/priority/category enums, statusHistory[],
  photo (Cloudinary URL or legacy data URL) + photoPublicId
- `notifications` — per-user persistent notifications
- `auditlogs` — append-only audit events (allowlisted actions/metadata)

Indexes: `issues{reportedBy,createdAt}`, `{assignedTo,createdAt}`, `{createdAt}`;
`notifications{userId}`, `{userId,read,createdAt}`.
