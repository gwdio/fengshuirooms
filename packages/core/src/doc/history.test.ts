import { describe, expect, it } from 'vitest'
import {
  applyChanges,
  currentValues,
  type ChangeBatch,
  type DocCollections,
  type Entity,
} from './doc.ts'
import { History } from './history.ts'

// A tiny harness standing in for the doc store: applies batches and feeds them to History.
function setup() {
  let docs: DocCollections = {}
  const history = new History()
  const apply = (batch: ChangeBatch) => {
    const previous = currentValues(docs, batch.changes)
    docs = applyChanges(docs, batch.changes)
    history.record({ ...batch, previous })
  }
  const put = (id: string, v: number, label = 'edit') =>
    apply({
      origin: 'local',
      label,
      changes: [{ collection: 't', id, value: { id, v } as Entity }],
    })
  const undo = () => {
    const r = history.undoBatch(docs)
    if (r) history.applyReverting(r.reverts, () => apply(r.batch))
    return r
  }
  const redo = () => {
    const r = history.redoBatch(docs)
    if (r) history.applyReverting(r.reverts, () => apply(r.batch))
    return r
  }
  const value = (id: string) => (docs.t?.[id] as (Entity & { v: number }) | undefined)?.v
  return { history, apply, put, undo, redo, value, docs: () => docs }
}

describe('History', () => {
  it('undoes and redoes edits in order', () => {
    const h = setup()
    h.put('a', 1, 'Add a')
    h.put('a', 2, 'Change a')
    h.undo()
    expect(h.value('a')).toBe(1)
    h.undo()
    expect(h.value('a')).toBeUndefined()
    expect(h.history.canUndo()).toBe(false)
    h.redo()
    expect(h.value('a')).toBe(1)
    h.redo()
    expect(h.value('a')).toBe(2)
    expect(h.history.canRedo()).toBe(false)
  })

  it('records undo and redo as forward entries linked to what they revert', () => {
    const h = setup()
    h.put('a', 1, 'Add a')
    h.undo()
    h.redo()
    const log = h.history.log()
    expect(log.map((e) => [e.seq, e.origin, e.label, e.reverts])).toEqual([
      [1, 'local', 'Add a', undefined],
      [2, 'undo', 'Undo Add a', 1],
      [3, 'redo', 'Add a', 2],
    ])
  })

  it('can undo a redo again', () => {
    const h = setup()
    h.put('a', 1)
    h.undo()
    h.redo()
    h.undo()
    expect(h.value('a')).toBeUndefined()
  })

  it('a new edit clears redo', () => {
    const h = setup()
    h.put('a', 1)
    h.undo()
    h.put('b', 1)
    expect(h.history.canRedo()).toBe(false)
  })

  it('never clobbers a change made by someone else after the edit', () => {
    const h = setup()
    h.put('a', 1)
    h.put('b', 1)
    h.apply({
      origin: 'local',
      label: 'Edit both',
      changes: [
        { collection: 't', id: 'a', value: { id: 'a', v: 2 } as Entity },
        { collection: 't', id: 'b', value: { id: 'b', v: 2 } as Entity },
      ],
    })
    h.apply({
      origin: 'remote',
      changes: [{ collection: 't', id: 'a', value: { id: 'a', v: 9 } as Entity }],
    })
    h.undo()
    expect(h.value('a')).toBe(9) // left alone
    expect(h.value('b')).toBe(1) // reverted
  })

  it('skips edits that were entirely overwritten since', () => {
    const h = setup()
    h.put('a', 1)
    h.put('b', 1)
    h.apply({
      origin: 'remote',
      changes: [{ collection: 't', id: 'b', value: { id: 'b', v: 9 } as Entity }],
    })
    h.undo() // b's edit can't be undone, so this undoes a's
    expect(h.value('b')).toBe(9)
    expect(h.value('a')).toBeUndefined()
  })

  it('does not offer remote changes for undo, and resets on load', () => {
    const h = setup()
    h.apply({ origin: 'remote', changes: [{ collection: 't', id: 'r', value: { id: 'r' } }] })
    expect(h.history.canUndo()).toBe(false)
    h.put('a', 1)
    h.apply({ origin: 'load', changes: [] })
    expect(h.history.canUndo()).toBe(false)
    expect(h.history.log()).toEqual([])
  })

  it('restores deleted entities as the same objects', () => {
    const h = setup()
    h.put('a', 1)
    const before = h.docs().t!.a
    h.apply({ origin: 'local', changes: [{ collection: 't', id: 'a', value: null }] })
    h.undo()
    expect(h.docs().t!.a).toBe(before)
  })
})
