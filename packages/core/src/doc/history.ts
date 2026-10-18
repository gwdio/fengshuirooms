import type { AppliedBatch, ChangeBatch, DocCollections, EntityChange } from './doc.ts'
import { currentValues, invertChanges } from './doc.ts'

// Undo/redo as forward commits, like `git revert`. The log is append-only: undoing an edit applies
// a new batch (origin 'undo') containing its inverse, and redoing applies the inverse of that undo
// (origin 'redo'). Nothing is ever popped off or rewritten, so undo and redo travel through
// persistence and (later) sync exactly like edits.
//
// Undo is selective: an entity is only reverted if it still holds exactly the value the original
// edit gave it. If something else changed it since (later: another person), that entity is left
// alone instead of being clobbered. If nothing in an edit can be reverted, it's skipped.

export interface HistoryEntry {
  /** Position in the log (stable for the session). */
  seq: number
  origin: AppliedBatch['origin']
  label?: string
  changes: readonly EntityChange[]
  previous: AppliedBatch['previous']
  /** For undo/redo entries: the entry this one reverted. */
  reverts?: number
  at: number
}

const MAX_ENTRIES = 1000

export class History {
  private entries: HistoryEntry[] = []
  private nextSeq = 1
  /** Entries that can be undone, most recent last. */
  private undoable: HistoryEntry[] = []
  /** Undo entries that can be redone, most recent last. */
  private redoable: HistoryEntry[] = []
  /** Set while applying an undo/redo so record() knows which entry it reverts. */
  private reverting: HistoryEntry | undefined

  /** Call with every applied batch, in order. */
  record(batch: AppliedBatch): void {
    if (batch.origin === 'load') {
      this.clear()
      return
    }
    const entry: HistoryEntry = {
      seq: this.nextSeq++,
      origin: batch.origin,
      label: batch.label,
      changes: batch.changes,
      previous: batch.previous,
      reverts: this.reverting?.seq,
      at: Date.now(),
    }
    this.entries.push(entry)
    if (this.entries.length > MAX_ENTRIES) this.entries.shift()

    if (batch.origin === 'local') {
      this.undoable.push(entry)
      this.redoable = [] // a new edit makes redo meaningless, as in any editor
    } else if (batch.origin === 'undo') {
      this.redoable.push(entry)
    } else if (batch.origin === 'redo') {
      this.undoable.push(entry)
    }
    // 'remote' entries are logged but are never undone by this client.
    if (this.undoable.length > MAX_ENTRIES) this.undoable.shift()
  }

  canUndo(): boolean {
    return this.undoable.length > 0
  }

  canRedo(): boolean {
    return this.redoable.length > 0
  }

  peekUndoLabel(): string | undefined {
    return this.undoable.at(-1)?.label
  }

  peekRedoLabel(): string | undefined {
    return stripUndoOrUndefined(this.redoable.at(-1)?.label)
  }

  /**
   * The batch that undoes the most recent undoable entry, or undefined. Apply it with
   * `applyReverting`, so the resulting entry is linked to what it reverts.
   */
  undoBatch(
    collections: DocCollections,
  ): { batch: ChangeBatch; reverts: HistoryEntry } | undefined {
    return this.revertFrom(this.undoable, 'undo', collections)
  }

  redoBatch(
    collections: DocCollections,
  ): { batch: ChangeBatch; reverts: HistoryEntry } | undefined {
    return this.revertFrom(this.redoable, 'redo', collections)
  }

  /** Applies a batch from undoBatch/redoBatch via `apply`, recording its link to the reverted entry. */
  applyReverting(reverts: HistoryEntry, apply: () => void): void {
    this.reverting = reverts
    try {
      apply()
    } finally {
      this.reverting = undefined
    }
  }

  /** The full append-only log, oldest first. */
  log(): readonly HistoryEntry[] {
    return this.entries
  }

  clear(): void {
    this.entries = []
    this.undoable = []
    this.redoable = []
  }

  private revertFrom(
    stack: HistoryEntry[],
    origin: 'undo' | 'redo',
    collections: DocCollections,
  ): { batch: ChangeBatch; reverts: HistoryEntry } | undefined {
    while (stack.length > 0) {
      const entry = stack.pop()!
      const current = currentValues(collections, entry.changes)
      // Only revert entities still exactly as this entry left them.
      const keep = entry.changes.map((c, i) => current[i] === c.value)
      const changes = entry.changes.filter((_, i) => keep[i])
      const previous = entry.previous.filter((_, i) => keep[i])
      if (changes.length === 0) continue // everything was changed since; nothing to revert
      const label = origin === 'undo' ? `Undo ${entry.label ?? 'edit'}` : stripUndo(entry.label)
      return { batch: { origin, label, changes: invertChanges(changes, previous) }, reverts: entry }
    }
    return undefined
  }
}

function stripUndo(label: string | undefined): string {
  return label?.startsWith('Undo ') ? label.slice(5) : (label ?? 'edit')
}

function stripUndoOrUndefined(label: string | undefined): string | undefined {
  return label === undefined ? undefined : stripUndo(label)
}
