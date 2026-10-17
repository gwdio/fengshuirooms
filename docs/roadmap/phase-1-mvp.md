# Phase 1 — MVP

**Goal:** usable for a real move-in, running locally (`npm run dev`). No deployment.

Suggested order — each item is roughly one PR:

### Foundations

- [ ] Zoom + pan on the stage (wheel zoom to cursor, space/middle-drag pan); world ↔ screen transform util in core
- [ ] Undo/redo history in the plan store (commit on action end, not per drag frame)
- [ ] localStorage persistence: auto-save on change, load last plan on start, schema-version check
- [ ] Plan list: create / rename / delete / switch plans

### Room

- [ ] Rectangle room tool (click-drag), walls rendered with thickness
- [ ] Free polygon wall tool (click points, close on first point / Enter)
- [ ] Wall length labels; type exact length to override
- [ ] Drag corners to edit; insert/delete points
- [ ] Doors on walls with swing arc (hinge side, in/out)
- [ ] Windows on walls with width

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
