# Refinements

Small improvements to things that already exist: interaction polish, missing gestures, quality-of-life.
Not tied to a phase. Add ideas here whenever they come up.

**When a phase starts**, go through this list with the owner and move any items worth doing into
that phase's checklist (then delete them here). Anything left waits for the next phase.

Format: one bullet per idea, with enough detail that it can be picked up cold.

## Unscheduled

- **Middle-click autoscroll pans the canvas.** A middle _click_ (press and release without moving)
  enters autoscroll: an anchor marker appears where you clicked, and the view pans continuously toward
  the pointer, faster the further it is from the anchor (small dead zone). Any click, Esc, or another
  middle press ends it. Middle _drag_ keeps panning as it does now (decided on release, like the Space
  tap/hold rule). Lives in `useCanvasNavigation.ts`; the speed curve goes in core.
