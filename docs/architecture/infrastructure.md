# Infrastructure

Nothing is deployed, and nothing will be until [Phase 4](../roadmap/phase-4-aws.md). Phases 1–3 run
locally (`npm run dev`). This doc describes the target. The only infra work before Phase 4 is keeping
the app compatible with it (see [Staying deployable](#staying-deployable)).

## Staying deployable

The rules that keep Phase 4 a hosting change, not a rewrite:

- **The web app is a static build.** `npm run build` produces `apps/web/dist/`, plain files that S3 +
  CloudFront can serve. No SSR, no server routes, no runtime server config.
- **No path-based routing until Phase 5.** Share links use the URL hash. If client routes appear
  later, CloudFront needs a 404 → `index.html` rewrite.
- **Build-time config only.** Anything environment-specific (API URL later) comes from `VITE_*` env
  vars read through one config module, never hardcoded.
- **`packages/core` stays runtime-neutral.** No DOM or React imports, only globals both browsers and
  Node 22 have (`crypto.randomUUID`, `CompressionStream`). Lambdas will import it in Phase 5.
- **Plans are self-contained JSON with `schemaVersion`.** Then the same blob can go into localStorage,
  a URL hash, or a DynamoDB item without changing shape.

## AWS stack

- **Runtime**: Lambda, Node.js 22 (no VPC)
- **Storage**: DynamoDB on-demand
- **APIs**: API Gateway HTTP API + WebSocket API
- **Static hosting**: S3 (private) + CloudFront (OAC, price class 100)
- **DNS / TLS**: Route 53 + ACM (cert in us-east-1 for CloudFront)
- **Auth (V3)**: Cognito
- **Monitoring**: CloudWatch logs/metrics/alarms

## Terraform

Right now `terraform/` holds only module READMEs ([`terraform/README.md`](../../terraform/README.md)).
Root configuration, remote state, and environments are created in Phase 4.

Intended shape ([ADR-0006](../decisions/0006-terraform-layout.md)):

```
terraform/
├── modules/
│   ├── static-site/      S3 + CloudFront + ACM            Phase 4
│   ├── data/             DynamoDB table                   Phase 5
│   ├── plan-api/         Lambda + HTTP API + IAM          Phase 5
│   ├── realtime-api/     Lambda + WebSocket API + IAM     Phase 6
│   └── auth/             Cognito                          Phase 7
└── <root config / environments>                           Phase 4, shape decided then
```

State goes in S3 with native locking (`use_lockfile = true`, Terraform ≥ 1.10), so there's no
DynamoDB lock table.

## CI/CD

**Now:** one GitHub Actions job runs `npm run check` (format, lint, typecheck, test, build) on PRs and
pushes to `main`. It doesn't deploy anything.

**Phase 4+ (planned):** `terraform plan` on PR, apply + `s3 sync` + CloudFront invalidation on merge.
AWS auth from Actions via OIDC, with no long-lived keys. Whether a separate dev environment exists is
decided in Phase 4 ([open questions](../decisions/open-questions.md)).

## Cost controls

Non-negotiable; see [cost.md](cost.md) for numbers.

- Billing alarms at $5 / $20 / $50, plus an AWS Budget with email
- `retention_in_days = 7` on **every** log group (default is never-expire)
- DynamoDB on-demand; no provisioned concurrency unless proven necessary
- No VPC, no NAT gateway
- CloudFront price class 100
- TTL on connection records
- `project=space-planner` tag on everything (via provider `default_tags`)
