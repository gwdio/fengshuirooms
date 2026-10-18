import { describe, expect, it } from 'vitest'
import type { Wall } from '../model/entities.ts'
import { snapTranslation, snapWallPoint, type SnapOptions } from './snap.ts'

const horizontal: Wall = {
  id: 'h',
  kind: 'wall',
  start: { x: 0, y: 0 },
  end: { x: 120, y: 0 },
  thickness: 4,
}
const diagonal: Wall = {
  id: 'd',
  kind: 'wall',
  start: { x: 0, y: 100 },
  end: { x: 100, y: 200 },
  thickness: 4,
}

const opts: SnapOptions = {
  endpoints: [horizontal.start, horizontal.end, diagonal.start, diagonal.end],
  walls: [horizontal, diagonal],
  radius: 3,
  precision: 1,
}

describe('snapWallPoint', () => {
  it('prefers an existing endpoint', () => {
    expect(snapWallPoint({ x: 118.5, y: 1 }, opts)).toEqual({
      point: { x: 120, y: 0 },
      kind: 'endpoint',
    })
  })

  it('snaps onto the face of a wall, rounding along it', () => {
    expect(snapWallPoint({ x: 50.4, y: 3.5 }, opts)).toEqual({
      point: { x: 50, y: 0 },
      kind: 'wall',
      wallId: 'h',
    })
  })

  it('rounds along the wall to the grid when grid snap is on', () => {
    expect(snapWallPoint({ x: 50, y: 2 }, { ...opts, grid: 12 }).point).toEqual({ x: 48, y: 0 })
  })

  it('keeps the exact projection on diagonal walls', () => {
    const r = snapWallPoint({ x: 51, y: 149 }, opts)
    expect(r.kind).toBe('wall')
    expect(r.point.x).toBeCloseTo(50)
    expect(r.point.y).toBeCloseTo(150)
  })

  it('falls back to the grid, then to precision', () => {
    expect(snapWallPoint({ x: 40, y: 50 }, { ...opts, grid: 12 })).toEqual({
      point: { x: 36, y: 48 },
      kind: 'grid',
    })
    expect(snapWallPoint({ x: 40.4, y: 50.6 }, opts)).toEqual({
      point: { x: 40, y: 51 },
      kind: 'free',
    })
  })
})

describe('snapTranslation', () => {
  const moving = [
    { x: 0, y: 0 },
    { x: 48, y: 0 },
  ]
  const base = { endpoints: [{ x: 100, y: 50 }], radius: 3, precision: 1 }

  it('rounds the delta to the grid', () => {
    expect(snapTranslation(moving, { x: 13, y: 20 }, { ...base, grid: 12 })).toEqual({
      delta: { x: 12, y: 24 },
    })
  })

  it('rounds to precision without a grid', () => {
    expect(snapTranslation(moving, { x: 13.4, y: 19.6 }, base)).toEqual({ delta: { x: 13, y: 20 } })
  })

  it('snaps a moving endpoint onto a nearby fixed corner', () => {
    // second point (48,0) + (51,49) = (99,49), within 3 of (100,50)
    expect(snapTranslation(moving, { x: 51, y: 49 }, { ...base, grid: 12 })).toEqual({
      delta: { x: 52, y: 50 },
      corner: { x: 100, y: 50 },
    })
  })
})

describe('snapTranslation onto parallel lines', () => {
  const fixed = { start: { x: 0, y: 0 }, end: { x: 120, y: 0 } }
  const moving = { start: { x: 30, y: 20 }, end: { x: 90, y: 20 } }
  const base = { endpoints: [], radius: 3, precision: 1 }
  const lines = { moving: [moving], fixed: [fixed] }

  it('lands a parallel wall exactly on the line, rounding along it', () => {
    const r = snapTranslation([moving.start, moving.end], { x: 5.4, y: -18.5 }, { ...base, lines })
    expect(r).toEqual({ delta: { x: 5, y: -20 }, line: fixed })
  })

  it('rounds along the line to the grid when it is on', () => {
    const r = snapTranslation(
      [moving.start, moving.end],
      { x: 5.4, y: -18.5 },
      { ...base, grid: 12, lines },
    )
    expect(r.delta).toEqual({ x: 0, y: -20 })
  })

  it('works on diagonal lines', () => {
    const f = { start: { x: 0, y: 0 }, end: { x: 100, y: 100 } }
    const m = { start: { x: 20, y: 22 }, end: { x: 50, y: 52 } } // ~1.4" off the line
    const r = snapTranslation(
      [m.start, m.end],
      { x: 1, y: 0 },
      { ...base, lines: { moving: [m], fixed: [f] } },
    )
    expect(r.line).toBe(f)
    const s = { x: m.start.x + r.delta.x, y: m.start.y + r.delta.y }
    expect(s.x).toBeCloseTo(s.y)
  })

  it('ignores lines that are far, not parallel, or not overlapping', () => {
    const far = snapTranslation([moving.start], { x: 0, y: -10 }, { ...base, lines })
    expect(far.line).toBeUndefined()
    const off = { moving: [{ start: { x: 300, y: 1 }, end: { x: 400, y: 1 } }], fixed: [fixed] }
    expect(snapTranslation([], { x: 0, y: -1 }, { ...base, lines: off }).line).toBeUndefined()
    const tilted = { moving: [{ start: { x: 30, y: 2 }, end: { x: 90, y: 4 } }], fixed: [fixed] }
    expect(snapTranslation([], { x: 0, y: -1 }, { ...base, lines: tilted }).line).toBeUndefined()
  })

  it('prefers a corner snap over a line snap', () => {
    const r = snapTranslation(
      [moving.start, moving.end],
      { x: -29, y: -19 },
      {
        ...base,
        endpoints: [{ x: 0, y: 0 }],
        lines,
      },
    )
    expect(r.corner).toEqual({ x: 0, y: 0 })
  })
})
