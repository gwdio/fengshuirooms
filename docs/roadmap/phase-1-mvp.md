# Phase 1 — MVP

**Goal:** usable for a real move-in, running locally (`npm run dev`). No deployment.

Suggested order — each item is roughly one PR:

### Foundations

- [ ] Zoom + pan on the stage (wheel zoom to cursor, space/middle-drag pan); world ↔ screen transform util in core
- [ ] Undo/redo: inverse change batches with origin `undo`, one entry per committed action (ADR-0011)
- [x] Document model + change stream; generic persistence engine (collections and local settings plug in): autosave, restore on start, per-collection versions, damaged-data tolerance (ADR-0011)
- [ ] Plan list: create / rename / delete / switch plans

- [x] Browser tests (`npm run e2e`): headless Firefox, covering keyboard and wall editing
- [x] Keyboard engine: single capture-phase listener, chord bindings with priorities, held-modifier tracking

### Room

- [x] Wall pen: click corners or drag single walls; close on start point; click the last corner again (double-click) or Enter to finish; walls rendered with thickness
- [x] Wall snapping: existing corners → points along existing walls → grid (global toggle with G or the toolbar, Shift held inverts) → whole inches
- [x] Wall length labels (live while drawing)
- [x] Select walls (click / shift-click) and delete them
- [ ] Type exact wall length to override
- [ ] Rectangle room tool (click-drag), if the pen proves slow for simple rooms
- [x] Drag corners (select tool): snaps like the pen, drop on a corner to merge, collapsed walls removed
- [x] Selected walls detach: dragging a wall (or a selected wall's corner) moves only the selection
- [x] Junctions split automatically: a wall ending on another wall splits it into two at that point
- [x] Inline walls merge automatically: end-to-end, same direction, nothing else at the corner
- [ ] Insert/delete points on walls
- [ ] Doors on walls with swing arc (hinge side, in/out) (deferred by owner; not in the MVP for now)
- [ ] Windows on walls with width (deferred by owner; not in the MVP for now)

### Furniture

- [ ] Drag from catalog panel onto canvas → `PlacedItem`
- [ ] Custom rect / oval items
- [ ] Select, move, rotate (15° snap; free with modifier), resize via `Konva.Transformer`
- [ ] Properties panel: width, depth, rotation, label, color — typed input respects unit setting
- [ ] Snap to grid and to walls
- [ ] Delete, duplicate

### Output & content

- [ ] Units toggle affects every displayed/entered length
- [ ] PNG export
- [ ] Catalog v1: ~30 common items with real dimensions
- [ ] URL-hash share link (gzip + base64url, includes schema version). Only usable as copy/paste import until there's a host, but it fixes the encoding early. ([ADR-0004](../decisions/0004-url-hash-sharing-first.md))

### Finish

- [ ] Minimal empty state ("draw your room" / "start from rectangle")

**Exit:** you can plan your actual move with this tool, locally. Use it before starting Phase 2.
