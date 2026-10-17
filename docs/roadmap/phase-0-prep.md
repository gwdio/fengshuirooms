# Phase 0 — Prep

**Goal:** a repo where feature work can start immediately.

- [x] Monorepo: npm workspaces with `apps/web`, `packages/core`
- [x] Vite + React + TypeScript scaffold
- [x] Tailwind v4 + Zustand wired
- [x] Konva vs SVG decided → Konva ([ADR-0009](../decisions/0009-konva-for-canvas.md))
- [x] Plan + catalog types in `packages/core`, schema version constant
- [x] oxlint, Prettier, Vitest; `npm run check` runs everything
- [x] `terraform/` placeholder: module READMEs only ([ADR-0006](../decisions/0006-terraform-layout.md))
- [x] GitHub Actions: `npm run check` on PRs (no deploys)
- [ ] Confirm CI goes green on GitHub after first push

**Exit:** `npm run check` green locally and in CI.
