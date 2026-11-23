# Real-time System (Socket.IO)

## Connection

Socket.IO client (`client/src/services/socketService.js`) connects to the same
origin as the API using `withCredentials` — the `campusfix_token` httpOnly cookie
authenticates the handshake. No JWT in localStorage; no second connection.

## Server auth (`server/src/socket/socketServer.js`)

On handshake the server:

1. Reads the auth cookie, verifies JWT signature + expiry.
2. Loads the user from MongoDB; rejects if missing, `isActive=false`,
   or `tokenVersion` mismatch.
3. Joins the socket to `user:{id}` and `role:{role}` rooms — assigned
   server-side only; there is no client room-join API.
4. Emits `ready {userId, role}`.

## Rooms & events

| Event | Recipients |
|---|---|
| `issue:created` | `role:admin` |
| `issue:assigned` | reporter + old/new assignee + `role:admin` |
| `issue:status_changed` | reporter + assignee + `role:admin` |
| `dashboard:stats_updated` | relevant role rooms |
| `staff:created` / `staff:approved` / `staff:rejected` | `role:admin` |
| `audit:new` | `role:admin` |
| `notification:new` / `notification:read` / `notification:read_all` | `user:{id}` |

All emits are best-effort (`emitTo*` never throws) and fire **only after**
successful DB writes — failed ops and no-ops emit nothing. Payloads are minimal
(ids, ticketId, status) — no secrets or unnecessary PII.

## Revocation

`logout` and `changePassword` bump `tokenVersion` and call
`disconnectUserSockets(userId)` — every live socket for that user disconnects
immediately (verified: all tabs drop, not just the acting one).

## Frontend (`client/src/hooks/useRealtime.js`)

`useRealtimeRefresh(events, refetch)` subscribes to events on the shared socket,
debounces refetches, cleans up listeners on unmount, and refetches once on
`connect` (reconnect recovery). Pages treat events as invalidation hints and
refetch authoritative API data — filters/pagination stay correct, no payload
trust, no duplicate list entries.

Integrated pages: all dashboards, issue lists, issue details, admin staff,
admin audit logs, plus the notification bell.

## Limitations

- Single-node only — horizontal scaling requires a Socket.IO Redis adapter.
- Polling + websocket transports; hosting must allow WebSocket upgrades.
