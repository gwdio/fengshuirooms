# terraform

**Placeholder.** There is no live Terraform here yet and nothing gets deployed until
[Phase 4](../docs/roadmap/phase-4-aws.md). Each `modules/*/README.md` describes what that module will
hold, so the shape is decided and later work can fill it in.

```
modules/
├── static-site/    S3 + CloudFront + ACM          Phase 4
├── data/           DynamoDB table                 Phase 5
├── plan-api/       Lambda + HTTP API + IAM        Phase 5
├── realtime-api/   Lambda + WebSocket API + IAM   Phase 6
└── auth/           Cognito                        Phase 7 (optional)
```

Root configuration, environments, and remote state are created in Phase 4, not before.

## Conventions for when this gets built

- AWS provider `~> 6.0`, Terraform ≥ 1.10 (S3-native state locking, no DynamoDB lock table)
- `project = "space-planner"` tag on everything via provider `default_tags`
- Every log group sets `retention_in_days = 7`
- No VPC or NAT gateway

## What the app must do now to stay deployable later

See [docs/architecture/infrastructure.md](../docs/architecture/infrastructure.md#staying-deployable).
