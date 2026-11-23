# Admin Analytics

`GET /api/admin/analytics` (admin only) feeds 5 Recharts on the admin dashboard
via `AnalyticsCharts.jsx`. Query params: `months` (1–24, default 6),
`startDate`, `endDate` (validated; date-only `endDate` includes the full day).

## Response

```json
{
  "statusDistribution": [{"name":"reported","count":3}, ...],
  "priorityDistribution": [{"name":"high","count":5}, ...],
  "categoryDistribution": [{"name":"it","count":4}, ...],
  "monthlyTrends": [{"month":"2025-11","reported":2,"resolved":1}, ...],
  "staffWorkload": [{"staffId":"...","name":"...","staffCode":"...","status":"active","total":4,"active":2}],
  "generatedAt": "ISO-8601"
}
```

## Calculations (all MongoDB aggregation pipelines)

- **Status / Priority / Category:** `$group` counts on the Issue enum fields,
  `createdAt` range-filtered.
- **Monthly trends:** reported = `$group` on `createdAt` month; resolved =
  `$unwind statusHistory` → latest `status:'resolved'` entry per issue
  (reopen→resolve counts only the newest month; no fabricated dates) → month
  buckets built server-side.
- **Staff workload:** `$group` on `assignedTo` (unassigned excluded); `active`
  excludes `resolved`/`rejected`; top 20 by total desc, `_id` asc tiebreak;
  names joined via safe User projection (`fullName`, `staffId`, `role`, `status`
  only — no email/password).

## Real-time

Chart component subscribes via `useRealtimeRefresh` to issue/stats/staff events
and refetches the endpoint (debounced); no second socket connection.
