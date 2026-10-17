# Phase 4 — AWS migration

**Goal:** the first deploy. Same product, on AWS, via Terraform, with cost tracking. This phase is the portfolio centerpiece —
document generously.

> ⚠️ Needs the owner: AWS account, domain purchase, and anything that spends money.

- [ ] AWS account hygiene: root MFA, IAM admin user/SSO, billing alarms ($5/$20/$50), Budget, Free Tier alerts, Cost Explorer, `project` cost-allocation tag
- [ ] Decide the Terraform root layout and environments (lean: single prod environment), recorded in an ADR
- [ ] State bucket bootstrap (S3, versioned, encrypted, native locking)
- [ ] GitHub OIDC provider + deploy role (Terraform-managed)
- [ ] `static-site` module: S3 (private) + CloudFront (OAC, price class 100) + ACM + Route 53
- [ ] CI: `terraform fmt`/`validate`/`plan` on PR; apply on merge (or manual, decided in the ADR)
- [ ] CI: build + `aws s3 sync` + CloudFront invalidation
- [ ] ADR for anything decided along the way; write-up of the migration in `docs/`
- [ ] Architecture section in the root README

**Exit:** live production URL on your own domain, deployed via `terraform apply`, README walks through the architecture.
