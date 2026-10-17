# 0010. Walls are independent straight segments

- **Status**: Accepted
- **Date**: 2026-10-17 (amended same day: junctions split, inline walls merge)
- **Revisit**: when corner dragging is built, if coordinate-matching gets fiddly

## Context

The original model described a room's walls as an ordered, closed polygon. Real use needs open
chains (half-walls, partial plans, tracing in progress), and the owner has confirmed walls are
always straight.

## Decision

`Room.walls` is an unordered list of straight `{start, end}` segments. A room doesn't need to be
closed. Connected walls share **exact** endpoint coordinates: the pen snaps to existing endpoints
and rounds everything else to whole inches, so equality checks are reliable.

**Walls are kept in canonical form.** After every wall edit the plan store runs `normalizeWalls`:

1. `splitWallsAtJunctions`: any wall with another wall's endpoint strictly inside it is split
   there (the first piece keeps the original id). A wall started from the middle of another gives
   three walls meeting at one shared corner, which then behaves like any other corner.
2. `mergeCollinearWalls`: two walls that meet end-to-end in a straight line, at a corner no other
   wall touches, with equal thickness, are joined into one. This undoes splits once the wall that
   caused them moves away, and turns collinear pen clicks into a single wall.

## Alternatives

- **Corner graph** (`corners[]` + walls referencing corner ids): this makes "drag a corner and every
  attached wall follows" trivial, but means more structure before it's needed. Nothing is persisted yet,
  so switching later only costs a schema bump and a migration.
- **Ordered closed polygon**: can't represent open walls.

## Consequences

- Corner dragging moves every endpoint that equals the dragged point (`moveCorner` in core).
  Dropping onto another corner merges them; walls that collapse to zero length are deleted.
- If any of the walls at a corner are selected, a corner drag moves only those, detaching them.
  Dragging a wall's body moves only the selected walls (`translateWalls`).
- Wall ids aren't stable across edits: merges drop one id (the store maps the selection to the
  survivor), and splits create new ones. Anything that references walls by id later (doors, windows)
  will need to follow these renames.
- There's no way to keep a deliberate corner in a straight wall (e.g. to put a door on one half):
  it merges as soon as nothing else touches it.
- Walls that cross in an X (no endpoint on the other wall) are not split.
- Overlapping or duplicate walls aren't prevented.
