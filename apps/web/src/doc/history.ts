import { History } from '@space-planner/core'
import { create } from 'zustand'
import { applyBatch, onChanges, useDoc } from './docStore.ts'

// Undo/redo for the open document: core's append-only History fed by the change stream. Undo and
// redo apply new batches (origin 'undo'/'redo'), so they're saved, and later synced, like edits.
// History lives in memory: it starts empty each session and resets when a document is loaded.

const history = new History()

interface HistoryState {
  canUndo: boolean
  canRedo: boolean
  /** Label of what undo/redo would do next, e.g. "Move corner". */
  undoLabel?: string
  redoLabel?: string
}

export const useHistory = create<HistoryState>()(() => ({ canUndo: false, canRedo: false }))

function publish() {
  useHistory.setState({
    canUndo: history.canUndo(),
    canRedo: history.canRedo(),
    undoLabel: history.peekUndoLabel(),
    redoLabel: history.peekRedoLabel(),
  })
}

onChanges((batch) => {
  history.record(batch)
  publish()
})

export function undo(): void {
  const next = history.undoBatch(useDoc.getState().collections)
  if (next) history.applyReverting(next.reverts, () => applyBatch(next.batch))
  publish()
}

export function redo(): void {
  const next = history.redoBatch(useDoc.getState().collections)
  if (next) history.applyReverting(next.reverts, () => applyBatch(next.batch))
  publish()
}

/** The append-only log, for debugging and a future history panel. */
export function historyLog() {
  return history.log()
}
