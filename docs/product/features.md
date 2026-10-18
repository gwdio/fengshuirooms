# Features

Version tags: **V1** = Phases 1–3 (static site), **V2** = Phases 5–6 (backend), **V3** = Phase 7.
Untagged items are V1. Which phase builds what lives in [the roadmap](../roadmap/README.md).

## Room construction

- Wall pen: click corners, or press-drag-release for a single wall; chains can stay open or close
  back on their start. New walls can start or end anywhere along an existing wall.
- Global snap-to-grid toggle (12" grid; G or toolbar); holding Shift inverts it.
  Walls are always straight (no curves, ever).
- Type exact wall lengths to override drag-defined dimensions
- Unit toggle (imperial / metric), per-project setting — display only, storage is inches ([ADR-0008](../decisions/0008-canonical-unit-inches.md))
- Edit walls after creation: drag corners (every wall at that corner follows; drop onto another
  corner to merge), drag walls (only the selection moves, detaching from neighbours; a selected
  wall's corners also detach), insert/delete points (not yet)
- Walls that meet partway along another wall split it, so every junction is a normal corner; walls
  that meet end-to-end in a straight line (nothing else at that corner) merge into one, and a wall
  dropped on top of a parallel wall merges with it
- Templates for common shapes: rectangle, L-shape, studio with alcove
- **Floorplan image import** — upload PNG/PDF, scale by dragging over a known dimension, trace walls
  over it. The image stays as a reference layer.

## Wall features

- Doors with swing arc (configurable hinge side and swing direction)
- Windows (placed along wall segments, configurable width)
- Fixed features: outlets, vents, radiators, closets

## Furniture placement

- Drag, drop, rotate (15° snap by default; free rotation with a modifier key)
- Rotation handle on selection
- Snap to grid, walls, and other furniture edges
- Type-to-input dimensions; resize via handles or numeric input
- Custom shapes: rectangle and oval with adjustable dimensions

## Layers

Three z-levels (no true 3D):

| Layer               | Examples                             | Behavior                                                            |
| ------------------- | ------------------------------------ | ------------------------------------------------------------------- |
| Floor               | rugs, mats                           | Visual only, never blocks placement                                 |
| Furniture (default) | everything else                      | Normal                                                              |
| Elevated            | lofted beds, wall shelves, bunk tops | Semi-transparent / dashed; may overlap lower layers without warning |

## Clearances

- **Auto-shown**: door swing arcs, drawer pullout (front face of dressers/desks/files), chair pullout
  (auto-attached to dining/office chairs)
- **User-defined**: select item → "add clearance" → drag a rectangle, optionally label it
  ("get out of bed", "open closet")
- All clearances render as faint dashed regions, toggleable globally

## Visibility view

Toggleable overlay. Full spec in [visibility.md](visibility.md).

## Editing & UX

- Undo / redo (deep stack)
- Multi-select (shift-click, drag-box), copy / paste
- Keyboard nudging: arrows = 1 unit, shift+arrows = 10 units
- Zoom and pan
- Empty state with starter templates

## Persistence

- Auto-save to localStorage on every edit
- Multiple plans per browser
- Multiple layouts per plan (Option A vs Option B)
- Annotations / sticky notes
- Cloud save, anonymous-friendly — **V2**

## Sharing

- Plan encoded in URL hash (gzip + base64), works up to ~30 KB ([ADR-0004](../decisions/0004-url-hash-sharing-first.md))
- Short URLs via backend; anonymous plans get a slug, optional password — **V2**
- Read-only vs editable links — **V2**
- Real-time collab — **V2**

## Export

- PNG (canvas snapshot)
- PDF with measurements — **V3**
- Shopping / item list (CSV or markdown) — **V3**
