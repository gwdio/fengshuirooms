# Operations & observability (V2+)

## Logging

- Structured JSON from every Lambda: `requestId`, plus `planId` / `connectionId` where relevant
- 7-day retention on every log group

## Metrics

- Lambda invocations / errors / duration (CloudWatch defaults)
- Custom: plans created, plans loaded, collab sessions started, collab messages, visibility renders
- DynamoDB consumed capacity

## Alarms

| Alarm              | Threshold       |
| ------------------ | --------------- |
| Lambda error rate  | > 1% over 5 min |
| DynamoDB throttles | > 0             |
| Billing            | $5, $20, $50    |

## Error tracking

- Frontend: Sentry free tier (5K events/mo) — can be added as early as Phase 1 if useful
- Backend: CloudWatch + Sentry SDK in Lambda

## Health

- `GET /health` on the Plan API
- Status page: V3, optional

## Things worth writing down while running it

Cold-start latency on first WS message, real monthly bill by service, any incident. These become
`docs/decisions/` entries or a `docs/ops-log.md` — they're the most valuable artifacts of Phases 4–6.
