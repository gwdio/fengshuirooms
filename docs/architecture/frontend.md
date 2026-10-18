# Frontend

`apps/web`. Stack and rationale in [overview.md](overview.md#stack).

## Modules

Layout under `apps/web/src/`. Create directories as work lands; don't scaffold empty ones.

| Module         | Responsibility                                                                                |
| -------------- | --------------------------------------------------------------------------------------------- |
| `boot.ts`      | Startup: registers document collections and local settings, starts persistence                |
| `doc/`         | The open document: store, change stream (`onChanges`), collection registry, plan meta         |
| `walls/`       | The walls feature's reads (`useWalls`) and edits (normalize, then `commitCollection`)         |
| `persistence/` | Generic engine: restores and saves registered collections and settings from the change stream |
| `input/`       | Keyboard engine (below). `keyboard.ts` is DOM-free and unit-tested                            |
| `editor/`      | Konva stage, rendering, tools (wall pen), handles, drags, snapping glue                       |
| `state/`       | Non-document UI stores: tool and grid snap, selection, notices                                |
| `panels/`      | Side panels, notice bar                                                                       |
| `overlays/`    | Planned: clearances, visibility view                                                          |
| `collab/`      | Planned (V2): WebSocket sync as another change-stream consumer                                |

Pure logic (geometry, snapping, normalization, the document model, snapshots, migrations) lives in
`packages/core`, not here.

## Document and change stream

See [ADR-0011](../decisions/0011-plan-as-entity-document.md) and [data-model.md](data-model.md).

- **Read** with collection hooks (`useWalls()`, `useMeta()`, or generic `useCollection(name)`); in
  handlers use the `get…()` equivalents.
- **Write** only through `commitCollection(name, next)`, which diffs and emits a batch. Feature
  modules wrap it (`walls/walls.ts`) so feature rules like normalization run first.
- **React** to changes with `onChanges(batch => …)`. Check `batch.origin`: e.g. persistence skips
  `load`, and drags cancel on non-`local` changes to what they hold.
- **Plug in a new feature's data** by registering its `CollectionSpec` in `boot.ts`. Persistence (and
  later sync) picks it up with no further code. Per-browser preferences use `registerLocalSetting`.

## Persistence

`persistence/engine.ts`. On start it restores local settings and the last document (via core's
forgiving snapshot reader), then saves after every non-`load` batch: debounced, and flushed on
`pagehide`/hidden. Problems go to the notice bar: a damaged entity is dropped (the original save is
backed up first), an unreadable document is left untouched while a fresh one starts, and a failed save
(e.g. storage full) shows a notice until saving works again.

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
preview (`previewWalls` in `editor/drag.ts`), committing once on drop.
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
