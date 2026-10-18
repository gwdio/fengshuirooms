import { describe, expect, it } from 'vitest'
import type { Point, Wall } from './entities.ts'
import {
  createWall,
  endpointsOf,
  mergeCollinearWalls,
  mergeOverlappingWalls,
  moveCorner,
  normalizeWalls,
  removeWalls,
  splitWallsAtJunctions,
  translateWalls,
  wallCollection,
  wallLength,
  wallsAtCorner,
} from './walls.ts'

const a = { x: 0, y: 0 }
const b = { x: 120, y: 0 }
const c = { x: 120, y: 96 }

function wall(start: Point, end: Point, thickness?: number): Wall {
  return createWall(start, end, thickness)!
}

describe('createWall', () => {
  it('creates a wall with a fresh id', () => {
    const w = wall(a, b)
    expect(w).toMatchObject({ start: a, end: b, thickness: 4.5 })
    expect(wallLength(w)).toBe(120)
    expect(wall(a, b).id).not.toBe(w.id)
  })
  it('refuses zero-length walls', () => {
    expect(createWall(a, { ...a })).toBeUndefined()
  })
})

describe('endpointsOf / wallsAtCorner / removeWalls', () => {
  const l = [wall(a, b), wall(b, c)]
  it('dedupes shared corners', () => {
    expect(endpointsOf(l)).toEqual([a, b, c])
  })
  it('finds walls at a corner', () => {
    expect(wallsAtCorner(l, b)).toHaveLength(2)
    expect(wallsAtCorner(l, { x: 5, y: 5 })).toEqual([])
  })
  it('removes by id', () => {
    expect(removeWalls(l, [l[0]!.id])).toEqual([l[1]])
  })
})

describe('moveCorner', () => {
  it('moves every wall endpoint at the corner, keeping untouched walls identical', () => {
    const extra = wall({ x: 0, y: 200 }, { x: 50, y: 200 })
    const l = [wall(a, b), wall(b, c), extra]
    const to = { x: 132, y: 12 }
    const [w1, w2, w3] = moveCorner(l, b, to)
    expect(w1).toMatchObject({ start: a, end: to })
    expect(w2).toMatchObject({ start: to, end: c })
    expect(w3).toBe(extra)
  })
  it('detaches only the given walls', () => {
    const l = [wall(a, b), wall(b, c)]
    const [w1, w2] = moveCorner(l, b, { x: 150, y: 10 }, [l[1]!.id])
    expect(w1).toBe(l[0])
    expect(w2!.start).toEqual({ x: 150, y: 10 })
  })
  it('drops walls that collapse', () => {
    const l = [wall(a, b), wall(b, c)]
    expect(moveCorner(l, b, a)).toMatchObject([{ start: a, end: c }])
  })
  it('returns the same array when nothing moves', () => {
    const l = [wall(a, b)]
    expect(moveCorner(l, b, { ...b })).toBe(l)
  })
})

describe('translateWalls', () => {
  it('moves only the given walls', () => {
    const l = [wall(a, b), wall(b, c)]
    const [w1, w2] = translateWalls(l, [l[1]!.id], { x: 12, y: 0 })
    expect(w1).toBe(l[0])
    expect(w2).toMatchObject({ start: { x: 132, y: 0 }, end: { x: 132, y: 96 } })
  })
  it('returns the same array for a zero delta', () => {
    const l = [wall(a, b)]
    expect(translateWalls(l, [l[0]!.id], { x: 0, y: 0 })).toBe(l)
  })
})

describe('splitWallsAtJunctions', () => {
  it('splits a wall where another wall starts on it', () => {
    const host = wall(a, b)
    const stub = wall({ x: 48, y: 0 }, { x: 48, y: 60 })
    const out = splitWallsAtJunctions([host, stub])
    expect(out).toHaveLength(3)
    expect(out[0]).toMatchObject({ id: host.id, start: a, end: { x: 48, y: 0 } })
    expect(out[1]).toMatchObject({ start: { x: 48, y: 0 }, end: b })
    expect(out[1]!.id).not.toBe(host.id)
    expect(out[2]).toBe(stub)
  })
  it('cuts at several points in order', () => {
    const out = splitWallsAtJunctions([
      wall(a, b),
      wall({ x: 90, y: 0 }, { x: 90, y: 30 }),
      wall({ x: 30, y: 0 }, { x: 30, y: 30 }),
    ])
    const host = out.filter((w) => w.start.y === 0 && w.end.y === 0)
    expect(host.map((w) => [w.start.x, w.end.x])).toEqual([
      [0, 30],
      [30, 90],
      [90, 120],
    ])
  })
  it('handles diagonal walls with an exact shared corner', () => {
    const mid = { x: 100 / 3, y: 100 / 3 }
    const out = splitWallsAtJunctions([wall(a, { x: 100, y: 100 }), wall(mid, { x: 0, y: 60 })])
    expect(out).toHaveLength(3)
    expect(out[0]!.end).toEqual(mid)
    expect(out[1]!.start).toEqual(mid)
  })
  it('leaves corners and crossings alone', () => {
    const l = [wall(a, b), wall(b, c), wall({ x: 60, y: -10 }, { x: 60, y: 10 })]
    expect(splitWallsAtJunctions(l)).toBe(l)
  })
})

describe('mergeCollinearWalls', () => {
  it('joins two inline walls meeting at a bare corner', () => {
    const first = wall(a, { x: 48, y: 0 })
    const second = wall({ x: 48, y: 0 }, b)
    const { walls, replaced } = mergeCollinearWalls([first, second])
    expect(walls).toEqual([{ ...first, start: a, end: b }])
    expect(replaced.get(second.id)).toBe(first.id)
  })
  it('joins a whole run, whatever the directions', () => {
    const { walls } = mergeCollinearWalls([
      wall(a, { x: 30, y: 0 }),
      wall({ x: 60, y: 0 }, { x: 30, y: 0 }),
      wall({ x: 60, y: 0 }, b),
    ])
    expect(walls).toHaveLength(1)
    expect([walls[0]!.start, walls[0]!.end]).toEqual(expect.arrayContaining([a, b]))
  })
  it('keeps corners, junctions, folds, and mixed thicknesses', () => {
    const mid = { x: 48, y: 0 }
    for (const l of [
      [wall(a, b), wall(b, c)],
      [wall(a, mid), wall(mid, b), wall(mid, { x: 48, y: 50 })],
      [wall(a, b), wall(b, { x: 60, y: 0 })],
      [wall(a, mid), wall(mid, b, 8)],
    ]) {
      expect(mergeCollinearWalls(l).replaced.size).toBe(0)
    }
  })
})

describe('normalizeWalls', () => {
  it('re-joins a split wall once the wall that split it moves away', () => {
    const stub = wall({ x: 48, y: 0 }, { x: 48, y: 60 })
    let walls = normalizeWalls([wall(a, b), stub]).walls
    expect(walls).toHaveLength(3)
    walls = normalizeWalls(translateWalls(walls, [stub.id], { x: 0, y: 12 })).walls
    expect(walls).toHaveLength(2)
    expect(walls.find((w) => w.id !== stub.id)).toMatchObject({ start: a, end: b })
  })
})

describe('wallCollection.parse', () => {
  it('accepts a valid wall and strips unknown fields', () => {
    const w = wall(a, b)
    expect(wallCollection.parse({ ...w, color: 'red' })).toEqual(w)
  })
  it.each([
    ['missing id', { start: a, end: b, thickness: 4 }],
    ['bad point', { id: 'x', start: { x: 'a', y: 0 }, end: b, thickness: 4 }],
    ['zero thickness', { id: 'x', start: a, end: b, thickness: 0 }],
    ['zero length', { id: 'x', start: a, end: { ...a }, thickness: 4 }],
    ['not an object', 'wall'],
  ])('rejects %s', (_, raw) => {
    expect(wallCollection.parse(raw)).toBeUndefined()
  })
})

describe('mergeOverlappingWalls', () => {
  it('joins a wall lying on top of another into one spanning both', () => {
    const host = wall(a, { x: 96, y: 0 })
    const dropped = wall({ x: 48, y: 0 }, b) // overlaps 48..96, extends to 120
    const { walls, replaced } = mergeOverlappingWalls([host, dropped])
    expect(walls).toEqual([{ ...host, start: a, end: b }])
    expect(replaced.get(dropped.id)).toBe(host.id)
  })
  it('absorbs a wall fully inside another, either direction', () => {
    const host = wall(a, b)
    const inside = wall({ x: 90, y: 0 }, { x: 30, y: 0 })
    expect(mergeOverlappingWalls([host, inside]).walls).toEqual([host].map((w) => ({ ...w })))
  })
  it('joins exact duplicates and diagonal overlaps', () => {
    expect(mergeOverlappingWalls([wall(a, b), wall(b, a)]).walls).toHaveLength(1)
    const d = mergeOverlappingWalls([
      wall(a, { x: 60, y: 60 }),
      wall({ x: 30, y: 30 }, { x: 90, y: 90 }),
    ])
    expect(d.walls).toMatchObject([{ start: a, end: { x: 90, y: 90 } }])
  })
  it('leaves parallel-but-apart, end-to-end, crossing, and mixed-thickness walls alone', () => {
    for (const l of [
      [wall(a, b), wall({ x: 0, y: 6 }, { x: 120, y: 6 })],
      [wall(a, { x: 60, y: 0 }), wall({ x: 60, y: 0 }, b)],
      [wall(a, b), wall({ x: 60, y: -10 }, { x: 60, y: 10 })],
      [wall(a, b), wall({ x: 30, y: 0 }, { x: 90, y: 0 }, 8)],
    ]) {
      expect(mergeOverlappingWalls(l).replaced.size).toBe(0)
    }
  })
})

describe('normalizeWalls with overlaps', () => {
  it('re-splits the merged wall where other walls meet it, and maps ids through both steps', () => {
    const host = wall(a, b)
    const stub = wall({ x: 30, y: 0 }, { x: 30, y: 40 })
    const dropped = wall({ x: 60, y: 0 }, { x: 150, y: 0 })
    const { walls, replaced } = normalizeWalls([host, stub, dropped])
    const straight = walls.filter((w) => w.start.y === 0 && w.end.y === 0)
    expect(straight.map((w) => [w.start.x, w.end.x].sort((p, q) => p - q))).toEqual([
      [0, 30],
      [30, 150],
    ])
    expect(walls.map((w) => w.id)).toContain(replaced.get(dropped.id))
  })
})
