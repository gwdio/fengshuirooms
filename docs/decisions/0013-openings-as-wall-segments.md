# 0013. Doors and windows are wall segments

- **Status**: Accepted
- **Date**: 2026-10-17
- **Revisit**: if openings need things a segment can't hold (e.g. sill heights for 3D-ish views)

## Context

The original model had a separate `WallFeature` entity: `wallId` + position 0–1 + width. With walls
that split, merge, and get new ids on every edit (ADR-0010), a reference to "wall X at 40%" breaks
constantly, and under sync (ADR-0011) it can dangle. The owner proposed treating a door or window as
"a weird wall that doesn't stack": placing it splits the wall, and deleting it turns it back into
wall that the auto-merge rejoins.

## Decision

- `Wall` gains `kind: 'wall' | 'door' | 'window'`, plus `hinge` (`start`/`end`) and `swing`
  (`left`/`right` of start→end) for doors. The `walls` collection is now **version 2**. A migration
  marks v1 entities `kind: 'wall'`. `WallFeature` is removed.
- **Placing** an opening cuts a plain wall into `[wall | opening | wall]` around the click, sliding
  inward to fit near an end. A wall shorter than the opening is refused.
- **Deleting** an opening turns it back into plain wall. Normalization then merges it with its
  neighbours, so the wall is whole again. Deleting plain walls still removes them.
- **Normalization never touches openings**: they don't merge (inline or overlapping) and aren't split
  at junctions. Openings are corners to snap to, but never faces or lines to snap onto.
- **Editing**: dragging a lone opening slides it along its wall (convert back to wall, re-place,
  same id). Dragging a corner where an opening attaches stays on the opening's line, which resizes
  it. Doors have Flip hinge / Flip swing in the properties panel.
- Defaults: 36" door, 36" window, wall thickness inherited from the host.

## Alternatives

- **WallFeature with `wallId` + position**: the original plan. Needs re-anchoring after every
  split, merge, or corner drag, and its references dangle under sync.
- **Features positioned in absolute coordinates, attached to whatever wall is underneath**: no
  dangling ids, but it needs a "which wall am I on" lookup everywhere, and walls don't visibly open.

## Consequences

- Every wall algorithm must decide what to do with openings; the rule is "openings are rigid". New
  wall code should check `kind`.
- A wall drawn from the middle of a door ends inside the door, without cutting it. It's legal, just
  odd, and could be prevented in the pen later.
- An opening whose neighbouring walls are deleted stays as a free segment.
- The visibility engine (Phase 3) gets its door and window sources directly from `kind`.
