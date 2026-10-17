# Frontend

`apps/web`. Stack and rationale in [overview.md](overview.md#stack).

## Modules

Planned layout under `apps/web/src/`. Create directories as work lands; don't scaffold empty ones.

| Module          | Responsibility                                                                                                                     |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `editor/`       | Konva stage, scenegraph rendering, hit-testing, selection, transform handles, zoom/pan                                             |
| `editor/tools/` | Mode-based interaction: select, draw-walls, place-feature, add-clearance. One active tool at a time.                               |
| `panels/`       | Catalog (search, categories, drag-to-canvas, recents/favorites), properties (dims, rotation, layer, color, label, per-type config) |
| `state/`        | Zustand stores. Plan mutations go through store actions so undo/redo and sync can intercept them.                                  |
| `persistence/`  | localStorage CRUD, URL-hash encode/decode (gzip via `CompressionStream` + base64url), cloud adapter (V2)                           |
| `overlays/`     | Clearances, visibility view (consumes `packages/core` visibility output)                                                           |
| `collab/` (V2)  | WebSocket client, optimistic updates, presence cursors                                                                             |

Pure logic — snapping math, wall polygon ops, visibility, serialization, migrations — lives in
`packages/core`, not here.

## Undo / redo

Plan state is immutable; each committed action pushes a snapshot (or patch) onto a history stack.
Drags commit **once on drag end**, not per frame. Selection and view state (zoom, pan) are not part
of history.

## Performance rules

- Render only the active layout
- Cap drag updates at one per animation frame
- Memoize visibility; recompute only on relevant changes, and only on drag end
- Static layers (grid, background image, walls) get `listening={false}` and are cached when stable
- Lazy-load catalog icons
