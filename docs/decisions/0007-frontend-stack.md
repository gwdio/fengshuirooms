# 0007. React + Zustand + Tailwind, npm-workspaces monorepo

- **Status**: Accepted
- **Date**: 2026-10-17
- **Revisit**: No

## Context

Closes the "React vs vanilla TS" open question from the original plan.

## Decision

- **React** — toolbars and panels benefit from components; familiar
- **Zustand** — small, fits a single plan document better than Redux; easy to intercept actions for undo/sync
- **Tailwind v4** — fast to iterate, no CSS architecture to maintain
- **npm workspaces** — `apps/web` + `packages/core` (+ `services/` later). No pnpm/turbo; the repo is
  small enough that plain npm is less to maintain.
- **oxlint + Prettier + Vitest** — what the current Vite template ships with, fast, low config

## Consequences

`packages/core` exports TypeScript source directly (no build step). Fine for Vite and for Lambda
bundling with esbuild later.
