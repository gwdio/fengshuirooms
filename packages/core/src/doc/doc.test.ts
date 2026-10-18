import { describe, expect, it } from 'vitest'
import { applyChanges, diffEntities, toEntityMap } from './doc.ts'

const e = (id: string, v = 0) => ({ id, v })

describe('diffEntities', () => {
  it('reports puts for new and changed entities and deletes for removed ones', () => {
    const keep = e('keep')
    const prev = toEntityMap([keep, e('changed'), e('gone')])
    const changed = e('changed', 1)
    const added = e('added')
    const next = toEntityMap([keep, changed, added])
    expect(diffEntities('things', prev, next)).toEqual([
      { collection: 'things', id: 'gone', value: null },
      { collection: 'things', id: 'changed', value: changed },
      { collection: 'things', id: 'added', value: added },
    ])
  })
  it('is empty when nothing changed', () => {
    const map = toEntityMap([e('a')])
    expect(diffEntities('things', map, { ...map })).toEqual([])
  })
})

describe('applyChanges', () => {
  it('applies puts and deletes, keeping untouched collections identical', () => {
    const other = toEntityMap([e('o')])
    const docs = { things: toEntityMap([e('a'), e('b')]), other }
    const out = applyChanges(docs, [
      { collection: 'things', id: 'a', value: null },
      { collection: 'things', id: 'c', value: e('c') },
      { collection: 'fresh', id: 'f', value: e('f') },
    ])
    expect(Object.keys(out.things!)).toEqual(['b', 'c'])
    expect(out.fresh).toEqual({ f: e('f') })
    expect(out.other).toBe(other)
    expect(Object.keys(docs.things)).toEqual(['a', 'b']) // input untouched
  })
  it('tolerates deleting what is already gone (late or duplicate remote changes)', () => {
    const docs = { things: toEntityMap([e('a')]) }
    expect(applyChanges(docs, [{ collection: 'things', id: 'zzz', value: null }]).things).toEqual(
      docs.things,
    )
  })
  it('returns the same object for no changes', () => {
    const docs = { things: toEntityMap([e('a')]) }
    expect(applyChanges(docs, [])).toBe(docs)
  })
})
