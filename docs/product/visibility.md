# Visibility / feng shui engine

An opt-in overlay that answers "who can see me here?" Framed as a 2D raycasting problem applied to a
real UX question, with a light feng-shui wink. Built in [Phase 3](../roadmap/phase-3-visibility.md).

## Algorithm

- **Sources**: 5–10 sample points along each door's open threshold, 3–5 along each window's interior edge
- **Occluders**: walls + items with `tall === true` (defaulted per catalog category)
- **Test**: for each grid cell (6" resolution), cast a ray to every source; the cell is "exposed" if
  any source has line of sight without crossing an occluder

Implementation options:

| Option                                     | Cost            | Result             | When                            |
| ------------------------------------------ | --------------- | ------------------ | ------------------------------- |
| Coarse grid                                | ~50 lines, fast | Slightly pixelated | MVP                             |
| Visibility polygon (Asano / angular sweep) | More code       | Crisp              | Only if perf or looks demand it |

Keep the engine in `packages/core` as pure functions (plan in → grid/polygon out) so it's unit-testable
without a canvas.

## Two views

- **Ninja view** (exposure): cast from doors/windows → red overlay where exposed. "Rest items"
  (beds, desks, reading chairs) in the red zone get a stronger outline.
- **Command view** (positive): for the selected item, cast back to doors → green outline if it has
  line of sight to the entry, red if blind.

## Tooltip voice

Light, opt-in, never preachy:

- "The ninjas can see you here. Probably fine for laundry. Less fine for your bed."
- "Mirror facing the bed = startle yourself at 3am. Also bad qi, apparently."
- "Your back is to the door. The ninjas will not announce themselves."

## Performance

- Recompute only on relevant changes: item moved, `tall` toggled, door/window edited
- During drag, compute on drag end, not per frame
- Move to a Web Worker only if it measurably janks (unlikely for a single room)
