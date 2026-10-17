# Architecture overview

## Shape of the system

V1 is a static single-page app; everything runs in the browser, and during Phases 1–3 it only runs locally. The backend appears in V2 and only
for things a browser can't do alone (cross-device save, short links, collab).

```
                 V1 (Phases 1–3)                          V2 (Phases 4–6)
┌───────────────────────────────────────┐    ┌─────────────────────────────────────────┐
│ Browser                               │    │ CloudFront ── S3 (static app)           │
│  apps/web  (React + Konva + Zustand)  │    │                                         │
│    └─ packages/core (model, geometry, │───▶│ HTTP API ── Lambda (plan-api) ─┐        │
│       catalog, visibility)            │    │                                ├─ DynamoDB
│  localStorage · URL-hash sharing      │    │ WS API ──── Lambda (realtime) ─┘        │
└───────────────────────────────────────┘    └─────────────────────────────────────────┘
```

## Repo layout

| Path            | What                                           | Notes                                              |
| --------------- | ---------------------------------------------- | -------------------------------------------------- |
| `apps/web`      | The editor SPA                                 | Vite, React, Konva, Zustand, Tailwind              |
| `packages/core` | Framework-free model, catalog, units, geometry | No React, no DOM. Will be imported by Lambdas too. |
| `services/`     | Lambda handlers                                | Created in Phase 5                                 |
| `terraform/`    | IaC                                            | Module READMEs only until Phase 4                  |
| `docs/`         | Everything you're reading                      |                                                    |

**Rule of thumb:** if logic can be expressed as "plan in → value out" (snapping, raycasting, clearance
geometry, serialization, migrations), it goes in `packages/core` with tests. `apps/web` is rendering
and interaction.

## Stack

| Concern              | Choice                                                | Why                                                 |
| -------------------- | ----------------------------------------------------- | --------------------------------------------------- |
| Build                | Vite                                                  | Fast, standard                                      |
| Language             | TypeScript (strict)                                   |                                                     |
| UI                   | React                                                 | [ADR-0007](../decisions/0007-frontend-stack.md)     |
| Canvas               | Konva via react-konva                                 | [ADR-0009](../decisions/0009-konva-for-canvas.md)   |
| State                | Zustand                                               | [ADR-0007](../decisions/0007-frontend-stack.md)     |
| Styling              | Tailwind v4                                           |                                                     |
| Lint / format / test | oxlint, Prettier, Vitest                              |                                                     |
| Backend runtime      | AWS Lambda (Node 22)                                  | [ADR-0005](../decisions/0005-serverless-backend.md) |
| Storage              | DynamoDB on-demand, single table                      | [data-model.md](data-model.md#backend-storage-v2)   |
| APIs                 | API Gateway HTTP + WebSocket                          |                                                     |
| Hosting              | None until Phase 4 (local only), then S3 + CloudFront | [ADR-0001](../decisions/0001-aws-for-production.md) |
| IaC                  | Terraform, S3 remote state                            | [ADR-0006](../decisions/0006-terraform-layout.md)   |
| CI/CD                | GitHub Actions                                        | [infrastructure.md](infrastructure.md#cicd)         |

## Detail docs

- [data-model.md](data-model.md) — plan, catalog, and DynamoDB shapes
- [frontend.md](frontend.md) — editor modules and performance rules
- [backend.md](backend.md) — Plan API, realtime protocol, data integrity
- [infrastructure.md](infrastructure.md) — AWS stack, Terraform, CI/CD, cost controls
- [operations.md](operations.md) — logging, metrics, alarms, error tracking
- [cost.md](cost.md) — monthly projections, gotchas, alternatives considered
