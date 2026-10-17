# 0006. Terraform with a module layout, built only when needed

- **Status**: Accepted
- **Date**: 2026-04 (amended 2026-10-17)
- **Revisit**: Phase 4, for the environment question

## Decision

All infrastructure is Terraform. Reusable pieces live in `terraform/modules/<concern>`. Remote state
goes in S3.

**Amendment (2026-10-17):**

- No Terraform is written before Phase 4. Until then `terraform/` holds only module READMEs that pin
  down the intended shape. The goal before then is compatibility: the app stays a static build that
  these modules can host ([infrastructure.md](../architecture/infrastructure.md#staying-deployable)).
- Separate dev/prod environment directories (the original plan) are no longer assumed. Phase 4
  decides between a single environment and dev + prod.
- State locking uses S3-native lockfiles (`use_lockfile = true`, Terraform ≥ 1.10), not a DynamoDB
  lock table.

## Alternatives

- Scaffolding bootstrap + dev/prod environments up front was tried and removed on 2026-10-17. It was
  config with nothing to deploy, extra CI, and decisions made before they were needed.

## Consequences

Phase 4 starts with a short design step: root layout, environments, and state bucket bootstrap.
