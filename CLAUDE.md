# CLAUDE.md

The owner reviews work through **end-of-task summaries** and the docs, not by watching each step.
That makes the summary the main oversight channel, so it has to cover what the owner would otherwise
have caught live. The docs carry memory between sessions, so keep them accurate.

## Orient

1. [docs/roadmap/README.md](docs/roadmap/README.md) — current phase
2. That phase's file — the first unchecked item is the default next task
3. [docs/architecture/overview.md](docs/architecture/overview.md) — layout and stack

## Current scope

Local MVP only (Phases 1–3, `npm run dev`). **No deployments, hosting, or cloud resources.** Infra
work right now means only keeping the app compatible with the eventual AWS setup. See
[infrastructure.md § Staying deployable](docs/architecture/infrastructure.md#staying-deployable).
Prefer the simplest thing that works, and don't add tooling, abstractions, or config ahead of need.

## Working rules

- **Branches are per functional area** (`walls`, later e.g. `furniture`, `persistence`), not per task.
  The owner won't reliably switch branches, so **at the start of every task check the current branch
  and `git status` yourself**. If the task belongs to a different area, switch to (or create, from
  `main`) that area's branch first. If uncommitted changes are present, don't carry them across
  areas silently: commit them on their own branch if they clearly belong there, otherwise ask. Say
  which branch you worked on in the summary.
- Tick the roadmap checkbox in the same commit as the work.
- `npm run check` must pass before anything is called done. For anything that touches canvas or
  keyboard interaction, `npm run e2e` must pass too, and new interactions get an e2e test.
- Logic that is "plan in → value out" (geometry, snapping, visibility, serialization, migrations)
  goes in `packages/core` with Vitest tests. `apps/web` is rendering and interaction.
- All stored lengths are inches ([ADR-0008](docs/decisions/0008-canonical-unit-inches.md)). Never
  store display units.
- If you change a persisted shape in `packages/core/src/model/plan.ts`, bump `SCHEMA_VERSION` and add a migration.
- Record non-obvious, hard-to-reverse choices as ADRs (`docs/decisions/template.md`) and add them to the index.
- Shortcuts go through the keyboard engine (`apps/web/src/input/`), never raw `keydown` listeners.
- Konva/canvas event handlers read state via `getState()`, never render closures
  ([frontend.md](docs/architecture/frontend.md#canvas-event-handlers)).
- If code and docs disagree, fix whichever is wrong in the same PR.

## Decide yourself vs ask

**Decide yourself** (and report it): implementation details, small libraries for a single feature, UI
layout within a panel, test strategy, and anything with a lean in
[open-questions.md](docs/decisions/open-questions.md) where the lean still looks right.

**Ask first:**

- Anything that deploys, spends money, or creates external accounts
- Adding a significant dependency (anything app-wide, or anything that shapes the architecture)
- Changing product scope, a non-goal, or an Accepted ADR
- Overriding a lean in open-questions.md
- Pushing to `main` or merging PRs

## End-of-task summary (required)

Finish every task with a summary in this shape. Leave out empty sections, but don't drop
uncomfortable ones.

- **Done**: what changed, at the level of behavior and files/modules, not a diff narration
- **Not done / deferred**: anything in scope that was skipped, stubbed, or only partly done, and why
- **Assumptions**: things taken as true without confirming (requirements, user behavior, data, environment)
- **Decisions**: choices made along the way, with the alternative and the reason. Mark the ones the
  owner should look at.
- **Architecture impact**: new modules, changed boundaries or data shapes, new dependencies, ADRs added or amended
- **Verification**: what was actually run (`npm run check`, manual testing in the browser, etc.) and
  what wasn't verified
- **Risks / follow-ups**: known weak spots, tech debt taken on, suggested next item

## Don't

- Touch `ldev/` (owner's private notes, excluded from git)
- Add 3D, required accounts, or anything that breaks "no signup, plan in 5 minutes"
- Write live Terraform or deployment config before Phase 4
