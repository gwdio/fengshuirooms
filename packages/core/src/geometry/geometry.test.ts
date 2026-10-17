import { describe, expect, it } from 'vitest'
import { closestPointOnSegment, nearestWithin, roundPoint } from './geometry.ts'

describe('roundPoint', () => {
  it('rounds to the step', () => {
    expect(roundPoint({ x: 10.4, y: 13.6 }, 1)).toEqual({ x: 10, y: 14 })
    expect(roundPoint({ x: 7, y: 8 }, 6)).toEqual({ x: 6, y: 6 })
  })
})

describe('nearestWithin', () => {
  const pts = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
  ]
  it('returns the closest candidate inside the radius', () => {
    expect(nearestWithin({ x: 8, y: 1 }, pts, 5)).toEqual({ x: 10, y: 0 })
  })
  it('returns undefined when nothing is close enough', () => {
    expect(nearestWithin({ x: 5, y: 5 }, pts, 3)).toBeUndefined()
  })
})

describe('closestPointOnSegment', () => {
  const a = { x: 0, y: 0 }
  const b = { x: 100, y: 0 }
  it('projects onto the segment interior', () => {
    expect(closestPointOnSegment({ x: 30, y: 7 }, a, b)).toEqual({ point: { x: 30, y: 0 }, t: 0.3 })
  })
  it('clamps to the ends', () => {
    expect(closestPointOnSegment({ x: -20, y: 5 }, a, b).point).toEqual(a)
    expect(closestPointOnSegment({ x: 140, y: 5 }, a, b).point).toEqual(b)
  })
})
