import { describe, expect, it } from 'vitest'
import { createEmptyPlan } from './create.ts'
import {
  addWall,
  allWalls,
  mergeCollinearWalls,
  moveCorner,
  normalizeWalls,
  translateWalls,
  removeWalls,
  splitWallsAtJunctions,
  wallEndpoints,
  wallLength,
  wallsAtCorner,
} from './walls.ts'

const a = { x: 0, y: 0 }
const b = { x: 120, y: 0 }
const c = { x: 120, y: 96 }

describe('addWall', () => {
  it('creates a room on the first wall', () => {
    const { plan, wall } = addWall(createEmptyPlan(), a, b)
    expect(plan.rooms).toHaveLength(1)
    expect(allWalls(plan)).toEqual([wall])
    expect(wallLength(wall!)).toBe(120)
  })

  it('appends to the existing room without mutating the input', () => {
    const first = addWall(createEmptyPlan(), a, b).plan
    const second = addWall(first, b, c).plan
    expect(allWalls(first)).toHaveLength(1)
    expect(allWalls(second)).toHaveLength(2)
    expect(second.rooms[0]!.id).toBe(first.rooms[0]!.id)
  })

  it('ignores zero-length walls', () => {
    const empty = createEmptyPlan()
    const result = addWall(empty, a, { ...a })
    expect(result.plan).toBe(empty)
    expect(result.wall).toBeUndefined()
  })
})

describe('wallEndpoints', () => {
  it('dedupes shared corners', () => {
    let plan = addWall(createEmptyPlan(), a, b).plan
    plan = addWall(plan, b, c).plan
    expect(wallEndpoints(plan)).toEqual([a, b, c])
  })
})

describe('removeWalls', () => {
  it('removes by id', () => {
    const { plan, wall } = addWall(createEmptyPlan(), a, b)
    expect(allWalls(removeWalls(plan, [wall!.id]))).toEqual([])
  })
})

describe('moveCorner', () => {
  function lShape() {
    let plan = addWall(createEmptyPlan(), a, b).plan
    plan = addWall(plan, b, c).plan
    return plan
  }

  it('moves every wall endpoint at the corner', () => {
    const plan = lShape()
    const to = { x: 132, y: 12 }
    const [w1, w2] = allWalls(moveCorner(plan, b, to))
    expect(w1!.end).toEqual(to)
    expect(w2!.start).toEqual(to)
    expect(w1!.start).toEqual(a)
    expect(w2!.end).toEqual(c)
  })

  it('does not mutate the input', () => {
    const plan = lShape()
    moveCorner(plan, b, { x: 1, y: 1 })
    expect(allWalls(plan)[0]!.end).toEqual(b)
  })

  it('drops walls that collapse to zero length', () => {
    const plan = lShape()
    const moved = moveCorner(plan, b, a)
    expect(allWalls(moved)).toHaveLength(1)
    expect(allWalls(moved)[0]).toMatchObject({ start: a, end: c })
  })

  it('returns the same plan when nothing moves', () => {
    const plan = lShape()
    expect(moveCorner(plan, b, { ...b })).toBe(plan)
  })
})

describe('wallsAtCorner', () => {
  it('finds walls touching the corner', () => {
    let plan = addWall(createEmptyPlan(), a, b).plan
    plan = addWall(plan, b, c).plan
    expect(wallsAtCorner(plan, b)).toHaveLength(2)
    expect(wallsAtCorner(plan, a)).toHaveLength(1)
    expect(wallsAtCorner(plan, { x: 5, y: 5 })).toEqual([])
  })
})

describe('moveCorner with onlyWallIds', () => {
  it('detaches just those walls at the corner', () => {
    let plan = addWall(createEmptyPlan(), a, b).plan
    const second = addWall(plan, b, c)
    plan = second.plan
    const to = { x: 150, y: 10 }
    const [w1, w2] = allWalls(moveCorner(plan, b, to, [second.wall!.id]))
    expect(w1!.end).toEqual(b)
    expect(w2!.start).toEqual(to)
  })
})

describe('translateWalls', () => {
  it('moves only the given walls, disconnecting them', () => {
    let plan = addWall(createEmptyPlan(), a, b).plan
    const second = addWall(plan, b, c)
    plan = second.plan
    const [w1, w2] = allWalls(translateWalls(plan, [second.wall!.id], { x: 12, y: 0 }))
    expect(w1).toMatchObject({ start: a, end: b })
    expect(w2).toMatchObject({ start: { x: 132, y: 0 }, end: { x: 132, y: 96 } })
  })

  it('returns the same plan for a zero delta', () => {
    const plan = addWall(createEmptyPlan(), a, b).plan
    expect(translateWalls(plan, [allWalls(plan)[0]!.id], { x: 0, y: 0 })).toBe(plan)
  })
})

describe('splitWallsAtJunctions', () => {
  it('splits a wall where another wall starts on it (T-junction)', () => {
    let plan = addWall(createEmptyPlan(), a, b).plan
    const host = allWalls(plan)[0]!
    plan = addWall(plan, { x: 48, y: 0 }, { x: 48, y: 60 }).plan
    const walls = allWalls(splitWallsAtJunctions(plan))
    expect(walls).toHaveLength(3)
    expect(walls[0]).toMatchObject({ id: host.id, start: a, end: { x: 48, y: 0 } })
    expect(walls[1]).toMatchObject({ start: { x: 48, y: 0 }, end: b })
    expect(walls[1]!.id).not.toBe(host.id)
  })

  it('cuts at several points in order along the wall', () => {
    let plan = addWall(createEmptyPlan(), a, b).plan
    plan = addWall(plan, { x: 90, y: 0 }, { x: 90, y: 30 }).plan
    plan = addWall(plan, { x: 30, y: 0 }, { x: 30, y: 30 }).plan
    const host = allWalls(splitWallsAtJunctions(plan)).filter(
      (w) => w.start.y === 0 && w.end.y === 0,
    )
    expect(host.map((w) => [w.start.x, w.end.x])).toEqual([
      [0, 30],
      [30, 90],
      [90, 120],
    ])
  })

  it('handles diagonal walls with an exact shared corner', () => {
    const d1 = { x: 0, y: 0 }
    const d2 = { x: 100, y: 100 }
    let plan = addWall(createEmptyPlan(), d1, d2).plan
    const mid = { x: 100 / 3, y: 100 / 3 }
    plan = addWall(plan, mid, { x: 0, y: 60 }).plan
    const walls = allWalls(splitWallsAtJunctions(plan))
    expect(walls).toHaveLength(3)
    expect(walls[0]!.end).toEqual(mid)
    expect(walls[1]!.start).toEqual(mid)
  })

  it('leaves corners and crossings alone', () => {
    let plan = addWall(createEmptyPlan(), a, b).plan
    plan = addWall(plan, b, c).plan // corner, not a junction
    plan = addWall(plan, { x: 60, y: -10 }, { x: 60, y: 10 }).plan // X crossing, no endpoint on it
    expect(splitWallsAtJunctions(plan)).toBe(plan)
  })
})

describe('mergeCollinearWalls', () => {
  it('joins two inline walls meeting at a bare corner', () => {
    let plan = addWall(createEmptyPlan(), a, { x: 48, y: 0 }).plan
    const first = allWalls(plan)[0]!
    const second = addWall(plan, { x: 48, y: 0 }, b)
    plan = second.plan
    const { plan: merged, replaced } = mergeCollinearWalls(plan)
    expect(allWalls(merged)).toEqual([{ ...first, start: a, end: b }])
    expect(replaced.get(second.wall!.id)).toBe(first.id)
  })

  it('joins a whole run of pieces', () => {
    let plan = addWall(createEmptyPlan(), a, { x: 30, y: 0 }).plan
    plan = addWall(plan, { x: 60, y: 0 }, { x: 30, y: 0 }).plan // reversed direction
    plan = addWall(plan, { x: 60, y: 0 }, b).plan
    const walls = allWalls(mergeCollinearWalls(plan).plan)
    expect(walls).toHaveLength(1)
    expect([walls[0]!.start, walls[0]!.end]).toEqual(expect.arrayContaining([a, b]))
  })

  it('keeps corners, junctions, folds, and mixed thicknesses', () => {
    const l = addWall(addWall(createEmptyPlan(), a, b).plan, b, c).plan
    expect(mergeCollinearWalls(l).replaced.size).toBe(0)

    let t = addWall(createEmptyPlan(), a, { x: 48, y: 0 }).plan
    t = addWall(t, { x: 48, y: 0 }, b).plan
    t = addWall(t, { x: 48, y: 0 }, { x: 48, y: 50 }).plan
    expect(mergeCollinearWalls(t).replaced.size).toBe(0)

    const fold = addWall(addWall(createEmptyPlan(), a, b).plan, b, { x: 60, y: 0 }).plan
    expect(mergeCollinearWalls(fold).replaced.size).toBe(0)

    const thick = addWall(
      addWall(createEmptyPlan(), a, { x: 48, y: 0 }).plan,
      { x: 48, y: 0 },
      b,
      8,
    ).plan
    expect(mergeCollinearWalls(thick).replaced.size).toBe(0)
  })
})

describe('normalizeWalls', () => {
  it('re-joins a split wall once the wall that split it moves away', () => {
    let plan = addWall(createEmptyPlan(), a, b).plan
    const stub = addWall(plan, { x: 48, y: 0 }, { x: 48, y: 60 })
    plan = normalizeWalls(stub.plan).plan
    expect(allWalls(plan)).toHaveLength(3)
    plan = normalizeWalls(translateWalls(plan, [stub.wall!.id], { x: 0, y: 12 })).plan
    const walls = allWalls(plan)
    expect(walls).toHaveLength(2)
    expect(walls.find((w) => w.id !== stub.wall!.id)).toMatchObject({ start: a, end: b })
  })
})
