# 0009. Konva (react-konva) for the editor canvas

- **Status**: Accepted
- **Date**: 2026-10-17
- **Revisit**: if Konva fights us on something core (e.g. crisp text/dimension labels at zoom)

## Context

The original plan leaned "SVG for MVP, Konva once item count grows." Item count will never be large
(one room, <100 items), so performance doesn't decide it. What does: the MVP needs drag, rotate with
15° snapping, resize handles, hit-testing on rotated shapes, and PNG export.

## Decision

Use Konva through react-konva from day one.

## Alternatives

- **SVG + React** — simpler DOM debugging and free CSS styling, but transform handles, rotated
  hit-testing, and PNG export all have to be hand-built
- **Raw canvas** — maximum control, maximum work

## Consequences

- `Konva.Transformer` gives rotate/resize handles with `rotationSnaps` out of the box
- `stage.toDataURL()` covers PNG export
- Bundle is ~300 KB larger; acceptable for an editor
- Switching to SVG later would be a rewrite of `apps/web/src/editor` — decided now to avoid that
