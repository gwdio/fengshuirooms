import { describe, expect, it } from 'vitest'
import {
  boundsOf,
  DEFAULT_VIEWPORT,
  fitBounds,
  MAX_SCALE,
  MIN_SCALE,
  panBy,
  screenToWorld,
  visibleGridStep,
  worldToScreen,
  zoomAt,
} from './viewport.ts'

describe('viewport', () => {
  it('converts world ↔ screen both ways', () => {
    const vp = { scale: 2, offset: { x: 10, y: -20 } }
    expect(worldToScreen({ x: 12, y: 24 }, vp)).toEqual({ x: 106, y: 172 })
    expect(screenToWorld({ x: 106, y: 172 }, vp)).toEqual({ x: 12, y: 24 })
  })

  it('keeps the point under the cursor fixed when zooming', () => {
    const cursor = { x: 300, y: 200 }
    const before = screenToWorld(cursor, DEFAULT_VIEWPORT)
    const vp = zoomAt(DEFAULT_VIEWPORT, cursor, 2.5)
    expect(vp.scale).toBe(2.5)
    const after = screenToWorld(cursor, vp)
    expect(after.x).toBeCloseTo(before.x)
    expect(after.y).toBeCloseTo(before.y)
  })

  it('clamps zoom', () => {
    expect(zoomAt(DEFAULT_VIEWPORT, { x: 0, y: 0 }, 1000).scale).toBe(MAX_SCALE)
    expect(zoomAt(DEFAULT_VIEWPORT, { x: 0, y: 0 }, 0.0001).scale).toBe(MIN_SCALE)
  })

  it('pans', () => {
    expect(panBy(DEFAULT_VIEWPORT, { x: 5, y: -7 }).offset).toEqual({ x: 5, y: -7 })
  })

  it('fits bounds centred, without zooming past 100%', () => {
    const big = fitBounds(
      { min: { x: 0, y: 0 }, max: { x: 400, y: 100 } },
      { width: 820, height: 600 },
      10,
    )
    expect(big.scale).toBeCloseTo(0.5)
    const mid = worldToScreen({ x: 200, y: 50 }, big)
    expect(mid.x).toBeCloseTo(410)
    expect(mid.y).toBeCloseTo(300)
    const tiny = fitBounds(
      { min: { x: 0, y: 0 }, max: { x: 10, y: 10 } },
      { width: 800, height: 600 },
    )
    expect(tiny.scale).toBe(1)
  })

  it('computes bounds', () => {
    expect(boundsOf([])).toBeUndefined()
    expect(
      boundsOf([
        { x: 3, y: -1 },
        { x: -2, y: 5 },
      ]),
    ).toEqual({ min: { x: -2, y: -1 }, max: { x: 3, y: 5 } })
  })

  it('coarsens the drawn grid when zoomed far out', () => {
    expect(visibleGridStep(DEFAULT_VIEWPORT, 12)).toBe(12) // 48px apart
    expect(visibleGridStep({ scale: 0.1, offset: { x: 0, y: 0 } }, 12)).toBe(60) // 12" = 4.8px
  })
})
