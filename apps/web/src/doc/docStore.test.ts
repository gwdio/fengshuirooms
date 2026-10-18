import { createWall, toEntityMap, wallCollection, type ChangeBatch } from '@space-planner/core'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setDrag, useEditDrag } from '../editor/drag.ts'
import { useSelection } from '../state/selectionStore.ts'
import { applyBatch, commitCollection, getCollection, onChanges, replaceDoc } from './docStore.ts'

const W = wallCollection.name
const w1 = createWall({ x: 0, y: 0 }, { x: 96, y: 0 })!
const w2 = createWall({ x: 96, y: 0 }, { x: 96, y: 48 })!

let batches: ChangeBatch[] = []
let stop: () => void
beforeEach(() => {
  replaceDoc('doc', { [W]: toEntityMap([w1, w2]) })
  batches = []
  stop = onChanges((b) => batches.push(b))
})
afterEach(() => stop())

describe('docStore', () => {
  it('emits only the entities that changed', () => {
    const moved = { ...w2, end: { x: 96, y: 60 } }
    commitCollection(W, [w1, moved])
    expect(batches).toEqual([
      { origin: 'local', changes: [{ collection: W, id: w2.id, value: moved }], previous: [w2] },
    ])
  })

  it('emits nothing for a no-op commit', () => {
    commitCollection(W, [w1, w2])
    expect(batches).toEqual([])
  })

  it('emits a load batch when the document is replaced', () => {
    replaceDoc('other', {})
    expect(batches[0]!.origin).toBe('load')
    expect(batches[0]!.changes.map((c) => c.value)).toEqual([null, null])
  })

  it('deselects entities deleted from anywhere', () => {
    useSelection.getState().select([w1.id, w2.id])
    applyBatch({ origin: 'remote', changes: [{ collection: W, id: w1.id, value: null }] })
    expect(useSelection.getState().selectedIds).toEqual([w2.id])
    expect(Object.keys(getCollection(W))).toEqual([w2.id])
  })

  it('cancels a drag when its walls change remotely, but not for local edits', () => {
    setDrag({ kind: 'walls', ids: [w1.id], startScreen: { x: 0, y: 0 }, snap: null })
    commitCollection(W, [w1, { ...w2, thickness: 6 }])
    expect(useEditDrag.getState().drag).not.toBeNull()
    applyBatch({ origin: 'remote', changes: [{ collection: W, id: w1.id, value: { ...w1 } }] })
    expect(useEditDrag.getState().drag).toBeNull()
  })
})
