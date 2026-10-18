import { describe, expect, it } from 'vitest'
import { createWall, wallCollection } from '../model/walls.ts'
import { createPlanMeta, metaCollection } from '../model/meta.ts'
import type { CollectionSpec } from './collection.ts'
import { toEntityMap } from './doc.ts'
import { readSnapshot, SnapshotError, writeSnapshot } from './snapshot.ts'

const specs = [metaCollection, wallCollection] as CollectionSpec[]
const w1 = createWall({ x: 0, y: 0 }, { x: 96, y: 0 })!
const w2 = createWall({ x: 96, y: 0 }, { x: 96, y: 48 })!
const meta = createPlanMeta('Studio')
const docs = { meta: toEntityMap([meta]), walls: toEntityMap([w1, w2]) }

describe('snapshots', () => {
  it('round-trip through JSON', () => {
    const json = JSON.stringify(writeSnapshot(docs, specs))
    expect(readSnapshot(json, specs)).toEqual({ collections: docs, preserved: {}, problems: [] })
  })

  it('drop only the damaged entities and say so', () => {
    const snap = writeSnapshot(docs, specs)
    snap.collections.walls!.entities.push({ id: 'bad', start: 'nowhere' }, { ...w1 })
    const { collections, problems } = readSnapshot(snap, specs)
    expect(Object.keys(collections.walls!)).toEqual([w1.id, w2.id])
    expect(problems).toEqual(['2 damaged walls entries were removed'])
  })

  it('keep unknown collections and write them back untouched', () => {
    const snap = writeSnapshot(docs, specs) as { collections: Record<string, unknown> }
    const furniture = { version: 1, entities: [{ id: 'sofa' }] }
    snap.collections.furniture = furniture
    const read = readSnapshot(snap, specs)
    expect(read.problems).toEqual([])
    expect(read.preserved).toEqual({ furniture })
    expect(writeSnapshot(read.collections, specs, read.preserved).collections.furniture).toEqual(
      furniture,
    )
  })

  it('keep collections from a newer app version aside instead of misreading them', () => {
    const snap = writeSnapshot(docs, specs)
    snap.collections.walls!.version = 99
    const read = readSnapshot(snap, specs)
    expect(read.collections.walls).toBeUndefined()
    expect(read.preserved.walls?.version).toBe(99)
    expect(read.problems[0]).toMatch(/newer version/)
  })

  it('migrate old entities step by step', () => {
    const v3: CollectionSpec = {
      name: 'things',
      version: 3,
      migrations: {
        1: (r) => ({ ...(r as object), b: 1 }),
        2: (r) => ({ ...(r as object), c: 2 }),
      },
      parse: (r) => r as { id: string },
    }
    const read = readSnapshot(
      { format: 1, collections: { things: { version: 1, entities: [{ id: 't' }] } } },
      [v3],
    )
    expect(read.collections.things).toEqual({ t: { id: 't', b: 1, c: 2 } })
  })

  it('keep a collection aside if a migration step is missing', () => {
    const v2: CollectionSpec = { name: 'things', version: 2, parse: (r) => r as { id: string } }
    const read = readSnapshot(
      { format: 1, collections: { things: { version: 1, entities: [{ id: 't' }] } } },
      [v2],
    )
    expect(read.preserved.things).toBeDefined()
    expect(read.problems[0]).toMatch(/couldn't be upgraded/)
  })

  it.each([
    ['bad JSON', '{'],
    ['not a snapshot', { walls: [] }],
    ['unknown format', { format: 2, collections: {} }],
  ])('reject %s', (_, input) => {
    expect(() => readSnapshot(input, specs)).toThrow(SnapshotError)
  })
})
