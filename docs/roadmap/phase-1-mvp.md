# Phase 1 — MVP

**Goal:** usable for a real move-in, running locally (`npm run dev`). No deployment.

Suggested order — each item is roughly one PR:

### Foundations

- [ ] Zoom + pan on the stage (wheel zoom to cursor, space/middle-drag pan); world ↔ screen transform util in core
- [x] Undo/redo as forward revert commits: selective (never clobbers newer changes), labelled, Mod+Z / Mod+Shift+Z / Mod+Y and toolbar buttons (ADR-0012)
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
- [x] Overlapping walls merge: a wall dropped onto a parallel wall snaps into line and joins it
- [ ] Insert/delete points on walls
- [x] Elements panel: click to pick Wall/Door/Window, drag in to drop one, drag off the canvas to delete (no W/D/N hotkeys)
- [x] Place mode: P returns to the last used element; ↑/↓ cycle elements (temporarily all arrows route to the panel)
- [x] Toolbar as a list of editor tools (Select V, Place P) driving both buttons and shortcuts
- [x] Doors and windows as wall segments: place on a wall, slide, resize by corner, flip door hinge/swing, delete back to wall (ADR-0013)

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
