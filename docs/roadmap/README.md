# Roadmap

## Status

**Current phase: [Phase 1 — MVP](phase-1-mvp.md)** · Phase 0 done except confirming CI on GitHub. Phases 1–3 are local-only; nothing is deployed before Phase 4.

Update this line whenever a phase closes.

## Phases

| #   | Phase                                        | Size         | Runs               | Exit criteria                              |
| --- | -------------------------------------------- | ------------ | ------------------ | ------------------------------------------ |
| 0   | [Prep](phase-0-prep.md)                      | 1 weekend    | Repo, scaffold, CI | `npm run check` green in CI                |
| 1   | [MVP](phase-1-mvp.md)                        | 2–3 weekends | Locally            | You can plan your actual move with it      |
| 2   | [Polish](phase-2-polish.md)                  | 1–2 weekends | Locally            | Floorplan import + layouts + layers usable |
| 3   | [Visibility view](phase-3-visibility.md)     | 1 weekend    | Locally            | Ninja + command views working              |
| 4   | [AWS migration](phase-4-aws.md)              | 2–3 weekends | AWS via Terraform  | Live on own domain via `terraform apply`   |
| 5   | [Plan API + cloud save](phase-5-plan-api.md) | 1–2 weekends | + HTTP API         | Short links work across devices            |
| 6   | [Real-time collab](phase-6-realtime.md)      | 2–3 weekends | + WebSocket API    | Two browsers edit the same plan live       |
| 7   | [Optional / V3](phase-7-optional.md)         | —            | —                  | Pick à la carte                            |

Phases 1–3 are V1 (local), 4–6 are V2 (deployed), 7 is V3. Feature details live in
[product/features.md](../product/features.md); phase files say _when_ and _done-when_, not _what exactly_.

## Principles

- **Every phase ends working.** Phases 1–3 end in a working local build that stays deployable as a static site ([rules](../architecture/infrastructure.md#staying-deployable)). Phase 4 is the first deploy.
- **Use the product.** Between phases, actually use it; let real use reorder the next phase.
- **Document as you go.** ADRs in [decisions/](../decisions/), and cost/deployment notes once those exist.
- **Small, reviewable PRs.** One checklist item (or a coherent slice of one) per PR.

## How to work a phase

1. Pick the first unchecked item in the current phase file.
2. Build it with tests for any logic in `packages/core`.
3. Tick the box in the same PR. If scope changed, edit the checklist rather than leaving it stale.
4. When every box is ticked and the exit criteria hold, update **Status** above.
