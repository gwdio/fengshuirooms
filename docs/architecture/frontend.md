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

`input/` holds the keyboard engine (below). `input/keyboard.ts` is DOM-free and unit-tested.

Pure logic — snapping math, wall polygon ops, visibility, serialization, migrations — lives in
`packages/core`, not here.

## Keyboard

All shortcuts go through one engine (`src/input/`). Nothing else adds `keydown` listeners.

- **Register** with `useKeyBindings([...], enabled)`: chords like `"w"`, `"Mod+z"`, `"Shift+Enter"`
  (Mod = Cmd on macOS, Ctrl elsewhere). Modifiers match exactly.
- **Priority**: `PRIORITY.global` < `PRIORITY.tool` < `PRIORITY.modal`. Among matches the highest
  priority wins, then the most recently registered. A handler can return `false` to pass the key on.
  Tools register their keys only while active.
- Handled keys are `preventDefault()`ed and stopped. The engine listens on `window` in the capture
  phase, so browser features (find-as-you-type, button activation) and page elements never see them.
- Text inputs, IME composition, and auto-repeat are ignored unless a binding opts in.
- **Held modifiers**: `useHeldKey('Shift')` in render, `keyboard.isHeld('Shift')` in handlers.
  Cleared on window blur so Shift can't get stuck after alt-tab.

## Canvas event handlers

Konva delivers mouse events outside React's event system, so React may not re-render between a
fast mousedown and mouseup. **Canvas handlers must read state with `store.getState()`, never from a
render closure.** Interactive tool state (e.g. the wall pen's chain and press) lives in a small Zustand
store for this reason, and render code subscribes to it.

Drags that change the plan (e.g. corner drags) keep their in-progress state in a store and render a
preview plan (`previewPlan` in `editor/cornerDrag.ts`), committing to the plan store once on drop.
Preview and commit use the same core function, so what you see is what you get.

Draggable Konva nodes whose position comes from props must be put back on drag end
(`e.target.position(...)`). Konva moves the node itself, and if the drop leaves the prop value
unchanged, React won't reset it, leaving a node displayed somewhere it doesn't belong.

Don't use Konva's `dblclick`: it fires for any two clicks within 400ms, even far apart. Detect
"same spot again" by position instead.

## Testing

- **Unit** (Vitest): `packages/core` logic and `apps/web/src/input/keyboard.ts`. Run with `npm test`.
- **Browser** (`apps/web/e2e/*.e2e.ts`, `node:test` + `puppeteer-core`): drives the real app in
  headless Firefox, using the system install (`FIREFOX_PATH`, default `/usr/bin/firefox`); no browser
  download. `npm run e2e` starts Vite in-process, runs every file, and stops it. `npm run e2e -- corners`
  runs only files whose name contains `corners`. Tests use plan inches. They read wall geometry
  straight from the Konva stage (`window.Konva`) and assert invariants such as "one handle per corner".
- `npm run e2e` is deliberately **not** in `npm run check` or CI. It's slow, and fast iteration
  matters more right now than making GitHub runners do it on every push. Run it locally for any
  canvas or keyboard change. If it's wired into CI later, the plan is to run it only on merges to
  `main`.

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
