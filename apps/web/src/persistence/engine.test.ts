import {
  createPlanMeta,
  createWall,
  metaCollection,
  toEntityMap,
  wallCollection,
  writeSnapshot,
} from '@space-planner/core'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { commitCollection, getCollection, replaceDoc, useDoc } from '../doc/docStore.ts'
import { useNoticeStore } from '../state/noticeStore.ts'
import { DocStorage, memoryStorage } from './docStorage.ts'
import { initPersistence, type PersistenceHandle } from './engine.ts'
import type { LocalSetting } from './localSettings.ts'

const specs = [metaCollection, wallCollection]
const W = wallCollection.name
const w1 = createWall({ x: 0, y: 0 }, { x: 96, y: 0 })!
const w2 = createWall({ x: 96, y: 0 }, { x: 96, y: 48 })!

let mem: ReturnType<typeof memoryStorage>
let docs: DocStorage
let handle: PersistenceHandle | undefined

function start(localSettings: LocalSetting[] = []) {
  handle = initPersistence({
    storage: mem,
    collections: specs,
    localSettings,
    docName: () => 'Test plan',
    saveDelayMs: 60_000, // tests flush explicitly
  })
  return handle
}

function seed(id: string, data: unknown) {
  docs.write(
    { id, name: 'seeded', updatedAt: 1 },
    typeof data === 'string' ? data : JSON.stringify(data),
  )
  docs.setActiveId(id)
}

beforeEach(() => {
  mem = memoryStorage()
  docs = new DocStorage(mem)
  replaceDoc('fresh', {})
  useNoticeStore.getState().dismiss()
})
afterEach(() => {
  handle?.stop()
  handle = undefined
})

describe('persistence engine', () => {
  it('saves local changes and restores them on the next start', () => {
    const p = start()
    commitCollection(W, [w1, w2])
    p.flush()
    p.stop()
    handle = undefined

    replaceDoc('somethingElse', {})
    start()
    expect(useDoc.getState().docId).toBe('fresh')
    expect(Object.keys(getCollection(W))).toEqual([w1.id, w2.id])
    expect(docs.list()[0]).toMatchObject({ name: 'Test plan' })
  })

  it("doesn't save when nothing changed, or for loads", () => {
    const p = start()
    replaceDoc('x', { [W]: toEntityMap([w1]) })
    p.flush()
    expect(docs.list()).toEqual([])
  })

  it('keeps an unreadable plan untouched and starts fresh with a notice', () => {
    seed('broken', '{not json')
    const p = start()
    expect(useNoticeStore.getState().notice).toMatch(/Couldn't open your last plan/)
    expect(useDoc.getState().docId).not.toBe('broken')
    commitCollection(W, [w1])
    p.flush()
    expect(docs.read('broken')).toBe('{not json')
  })

  it('loads what it can, backs up the original, and reports what was dropped', () => {
    const snap = writeSnapshot({ [W]: toEntityMap([w1]) }, specs)
    snap.collections[W]!.entities.push({ id: 'junk' })
    seed('doc1', snap)
    start()
    expect(Object.keys(getCollection(W))).toEqual([w1.id])
    expect(useNoticeStore.getState().notice).toMatch(/1 damaged walls entry was removed/)
    expect(mem.getItem('space-planner:doc-backup:doc1')).toBe(JSON.stringify(snap))
  })

  it('writes unknown collections back unchanged', () => {
    const snap = writeSnapshot(
      { [W]: toEntityMap([w1]), meta: toEntityMap([createPlanMeta('Mine')]) },
      specs,
    ) as { collections: Record<string, unknown> }
    const furniture = { version: 3, entities: [{ id: 'sofa', anything: true }] }
    snap.collections.furniture = furniture
    seed('doc1', snap)
    const p = start()
    commitCollection(W, [w1, w2])
    p.flush()
    expect(JSON.parse(docs.read('doc1')!).collections.furniture).toEqual(furniture)
  })

  it('restores and saves registered local settings', () => {
    let value = true
    const listeners = new Set<() => void>()
    const setting: LocalSetting<boolean> = {
      key: 'flag',
      parse: (raw) => (typeof raw === 'boolean' ? raw : undefined),
      get: () => value,
      set: (v) => void (value = v),
      subscribe: (cb) => (listeners.add(cb), () => listeners.delete(cb)),
    }
    docs.writeLocal('flag', false)
    start([setting])
    expect(value).toBe(false)
    value = true
    listeners.forEach((l) => l())
    expect(docs.readLocal('flag')).toBe(true)
  })

  it('shows a notice when saving fails, and clears it once saving works again', () => {
    const p = start()
    const realSet = mem.setItem
    mem.setItem = () => {
      throw new Error('QuotaExceededError')
    }
    commitCollection(W, [w1])
    p.flush()
    expect(useNoticeStore.getState().notice).toMatch(/Couldn't save/)
    mem.setItem = realSet
    commitCollection(W, [w1, w2])
    p.flush()
    expect(useNoticeStore.getState().notice).toBeNull()
  })
})
