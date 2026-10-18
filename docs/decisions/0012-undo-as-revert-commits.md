# 0012. Undo/redo as forward "revert" commits

- **Status**: Accepted
- **Date**: 2026-10-17
- **Revisit**: Phase 6, once concurrent edits exist

## Context

The usual undo stack pops state off and rewinds. That fits badly with ADR-0011, where every change is
a batch that persistence saves and, later, peers receive. Rewinding has no batch to send, and in a
shared document "rewind to before my edit" would also discard other people's work. The owner asked
for undo to work "as forward commits, like git history".

## Decision

- History is an **append-only log** of every applied batch (`packages/core/src/doc/history.ts`).
- **Undo = revert**: it applies a new batch with origin `undo` containing the inverse of the most
  recent undoable edit, linked to it (`reverts`). **Redo = revert the revert** (origin `redo`). Redo
  can itself be undone again. A new local edit clears redo.
- Inverses come from the values each batch replaced. The doc store passes them to listeners as
  `AppliedBatch.previous`.
- **Undo is selective**: an entity is reverted only if it still holds exactly the value the edit
  gave it. Anything changed since (later: by someone else) is left alone, and an edit with nothing
  left to revert is skipped. Your undo never overwrites a collaborator's newer change.
- Only your own `local` edits are undoable. `remote` batches are logged but never undone by you.
  `load` resets history.
- One user action = one batch = one undo step. Drags commit once on drop, and normalization
  (split/merge) is part of the same batch, so undo restores the exact pre-edit walls.
- Batches carry a `label` ("Move corner"), shown on the Undo/Redo buttons and kept in the log.

## Alternatives

- **Snapshot stack** (store whole documents): trivial, but rewinds rather than reverts, can't be
  synced, and can't avoid clobbering others.
- **Command pattern** (each action implements undo): duplicates logic per feature. Batches already
  describe every change generically.

## Consequences

- Undo and redo are persisted and (later) synced like any edit, with no special cases downstream.
- History is in memory only. Reloading keeps the undone state but starts an empty history.
- A partial revert (some entities skipped) could leave walls un-normalized, e.g. if a peer moved one
  wall of a merged pair. That's acceptable for now and fits the Phase 6 normalization question in
  ADR-0011.
