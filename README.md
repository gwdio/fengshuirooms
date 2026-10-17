# Space Planner

> Plan your space in 5 minutes, no signup, on any device.

A lightweight, browser-based room planner for people who just moved somewhere and want to know if
their stuff fits. It sits between heavyweight 3D planners (Floorplanner, Planner 5D) and graph paper:
draw or trace your room, drop in furniture at real sizes, see door swings and drawer clearances, and
share the plan with a link.

**Status:** early development, scaffold only. The MVP is being built to run locally; nothing is deployed yet. See the [roadmap](docs/roadmap/README.md).

## What it does (planned)

- Draw a room by clicking corners, or trace over an uploaded floorplan image
- Doors, windows, outlets; furniture from a catalog or custom rectangles/ovals
- Snap, rotate, type exact dimensions; imperial or metric
- Clearance zones for door swings, drawers, chairs
- **Visibility view** — a 2D raycasting overlay showing what's exposed to doors and windows (a.k.a.
  "can the ninjas see my bed")
- Multiple layouts per room for A/B comparison
- Saves locally; share via URL; later, cloud save and real-time collaboration

No 3D, no accounts required, no marketplace. [Full scope →](docs/product/vision.md)

## Getting started

Requires Node 22+.

```sh
npm install
npm run dev        # http://localhost:5173
```

| Command          | Does                                                       |
| ---------------- | ---------------------------------------------------------- |
| `npm run dev`    | Start the web app                                          |
| `npm run build`  | Production build of `apps/web`                             |
| `npm run check`  | Format check, lint, typecheck, tests, build — what CI runs |
| `npm test`       | Vitest across workspaces                                   |
| `npm run format` | Prettier write                                             |

## Repo layout

```
apps/web/         React + Konva editor (Vite, Zustand, Tailwind)
packages/core/    Plan model, catalog, units, geometry — no React, shared with future Lambdas
terraform/        Placeholder module READMEs; real infra starts at Phase 4
docs/             Product, architecture, roadmap, decisions
```

## Architecture

V1 is a fully static single-page app, run locally while the MVP is built. V2 moves hosting to AWS (S3 + CloudFront) via Terraform and adds
a serverless backend — Lambda, DynamoDB, API Gateway HTTP + WebSocket — for cloud save, short links,
and live collaboration. [Overview →](docs/architecture/overview.md) ·
[Decisions →](docs/decisions/README.md)

## License

[MIT](LICENSE)
