# 0011. The plan is a document of entity collections with one change stream

- **Status**: Accepted
- **Date**: 2026-10-17
- **Revisit**: Phase 6 (realtime), once concurrent edits are actually exercised

## Context

Persistence was about to save the plan as one nested blob (`Plan → rooms[] → walls[]`, with
`layouts[] → items[]`). The owner asked for persistence to be a separate system that every feature
plugs into, like the keyboard engine, and for the design to survive realtime collaboration over
websockets later, where entities can change or vanish at any moment because of another person.

A nested blob fails both. Every feature would be tied to one schema version and one validator, and
there's no unit of change smaller than "the whole plan" to save, undo, or send to a peer.

## Decision

- **The plan is a document**: named collections of entities keyed by id (`walls`, `meta`, later
  `items`, `features`, …), defined in `packages/core/src/doc/`. Nesting is replaced by references
  (e.g. a future `PlacedItem.layoutId`). Rooms are dropped; walls don't need them (ADR-0010).
- **Every change is a batch of per-entity puts and deletes** (`EntityChange`), tagged with an origin:
  `local`, `load`, `remote`, or `undo`. Last write wins per entity, matching the plan in
  [backend.md](../architecture/backend.md).
- **One change stream.** `applyBatch` updates the document and notifies `onChanges` listeners.
  Persistence, selection pruning, and drag cancellation listen to it now; undo and sync will too.
  No feature calls persistence directly.
- **Features plug in by registering**: a `CollectionSpec` (name, version, per-entity `parse`, and
  migrations) for document data, or a `LocalSetting` for per-browser preferences. Registration
  happens in `apps/web/src/boot.ts`.
- **Reading is forgiving, per entity.** The snapshot format drops only invalid entities, keeps unknown
  or newer collections verbatim and writes them back, and never overwrites data it couldn't read.
  Remote batches will go through the same `parse`.
- **Normalization runs only on local edits.** Feature-level cleanups such as wall split/merge run
  before a local commit and their results travel as ordinary changes. Remote and load batches are
  applied as-is, so two clients never both "fix" the same thing.
- **UI must tolerate things vanishing.** Anything keyed by entity id that outlives a render
  (selection, drags, tool state) either listens to the change stream or treats a missing id as a
  no-op. Missing singletons (like `meta`) read as defaults.

## Alternatives

- **Nested plan blob with a schema version**: simplest for localStorage, but wrong for undo and sync,
  and one bad wall would make the whole plan unreadable.
- **A CRDT library (Yjs, Automerge)**: handles concurrency properly but is a large dependency and a
  new mental model, for a 2–3 person collab. Per-entity last-write-wins is enough to start, and the
  change-batch boundary is where a CRDT would plug in if that proves wrong.

## Consequences

- Undo applies the inverse batch with origin `undo` (built in [ADR-0012](0012-undo-as-revert-commits.md)).
  Sync will send `local`/`undo`/`redo` batches and apply received ones as `remote`.
- Entity references can dangle: an item's `layoutId` may point at something a peer deleted.
  Readers must handle that. (Doors and windows avoid references entirely; see ADR-0013.)
- **Known Phase 6 problem**: concurrent local normalizations can diverge. If two people split the
  same wall at once, each split creates pieces with random ids, and the merged result can overlap.
  Candidate fixes are deterministic ids for derived pieces (from host id + cut point), or
  re-normalizing on the server. This is deliberately left for when sync exists.
- Whole-entity granularity means two people editing different fields of the same wall conflict, and
  one edit wins. That's fine for walls; revisit if entities get large.
