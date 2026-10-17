# Cost

## Monthly projections (AWS, post-free-tier)

| Service           | Idle    | Light (you + testers) | ~100 MAU   | ~10K MAU    |
| ----------------- | ------- | --------------------- | ---------- | ----------- |
| S3 + CloudFront   | <$0.50  | <$1                   | $1–3       | $5–15       |
| Lambda (Plan API) | $0      | $0                    | <$1        | $2–5        |
| Lambda (Realtime) | $0      | $0                    | <$1        | $5–15       |
| DynamoDB          | $0      | $0                    | <$1        | $3–10       |
| API Gateway HTTP  | $0      | $0                    | <$1        | $2–5        |
| API Gateway WS    | $0      | $0                    | <$1        | $5–20       |
| CloudWatch        | $0–1    | $0–1                  | $1–3       | $5–10       |
| Route 53          | $0.50   | $0.50                 | $0.50      | $0.50       |
| ACM               | $0      | $0                    | $0         | $0          |
| **Total**         | **~$1** | **~$1–3**             | **~$5–10** | **~$30–80** |

These are estimates from the original plan. Replace with real Cost Explorer numbers once Phase 4 is live.

## Gotchas

- **CloudWatch log retention** defaults to never-expire. Set 7 days everywhere.
- **NAT gateway** is ~$32/mo flat. Don't put Lambdas in a VPC.
- **CloudFront cache misses** — cache aggressively, content-hash asset filenames (Vite does this).
- **DynamoDB scans** — never. Design for `Query`.
- **Provisioned concurrency** — only if cold starts are a demonstrated problem.

## Billing protection

- CloudWatch billing alarms at $5 / $20 / $50
- AWS Budget with email notifications
- Free Tier usage alerts on
- `project=space-planner` tag on every resource, activated as a cost-allocation tag

Alternatives considered (Cloudflare, Fly.io, Fargate) are in [ADR-0005](../decisions/0005-serverless-backend.md).
