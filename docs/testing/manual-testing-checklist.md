# Manual Testing Checklist

> Manual checklist — not an automated test report. Run through after `npm run dev`
in both `server/` and `client/`. Use dedicated test accounts only.

## Accounts needed

- [ ] Student account (register via UI)
- [ ] Staff account (register → pending → admin approves)
- [ ] Admin account (`npm run seed:admin` or promoted user)

## Student

- [ ] Register, login, logout; password change invalidates other sessions
- [ ] Report issue without photo → appears in My Issues
- [ ] Report issue with photo (requires Cloudinary creds)
- [ ] Search/filter/paginate own issues
- [ ] Issue details show status history
- [ ] Notification bell increments on assignment/status change
- [ ] Cannot reach /admin or /staff routes

## Admin

- [ ] Dashboard stats + 5 analytics charts render real data
- [ ] Issues list: filter, search, paginate; assign/reassign staff
- [ ] Create staff; approve/reject pending staff
- [ ] Audit Logs page: filters, pagination, newest-first
- [ ] Analytics refresh after issue events (open two sessions)

## Staff

- [ ] Pending staff cannot log in; after approval can
- [ ] See only assigned issues; cannot see others'
- [ ] Status transitions per rules; history updates
- [ ] Notifications for new assignments

## Realtime (two browser profiles)

- [ ] Student creates issue → admin list/dashboard updates w/o refresh
- [ ] Admin assigns → staff + student views update
- [ ] Staff changes status → student/admin/staff update
- [ ] Logout in tab A disconnects sockets in tab B
- [ ] Reconnect refetches data (toggle backend or wait)

## Security spot-checks

- [ ] API calls without cookie → 401; student→admin route → 403
- [ ] Mutating request without CSRF header → 403
- [ ] DevTools: no JWT in localStorage; cookies httpOnly

## Responsive

- [ ] Dashboard/charts usable at ~375px width
- [ ] Tables/lists stack on mobile

Pass/Fail notes: ______________________________
