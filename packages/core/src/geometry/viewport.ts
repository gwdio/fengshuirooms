import type { Point } from '../model/entities.ts'

// World (inches) ↔ screen (stage pixels) transform for the editor canvas:
//   screen = world * PX_PER_INCH * scale + offset
// Pure functions; the app keeps the current Viewport in a store.

/** Stage pixels per inch at 100% zoom. */
export const PX_PER_INCH = 4
export const MIN_SCALE = 0.1
export const MAX_SCALE = 8

export interface Viewport {
  /** Zoom factor; 1 = 100%. */
  scale: number
  /** Screen position of the world origin, in stage pixels. */
  offset: Point
}

export const DEFAULT_VIEWPORT: Viewport = { scale: 1, offset: { x: 0, y: 0 } }

export function pixelsPerInch(vp: Viewport): number {
  return PX_PER_INCH * vp.scale
}

export function worldToScreen(world: Point, vp: Viewport): Point {
  const k = pixelsPerInch(vp)
  return { x: world.x * k + vp.offset.x, y: world.y * k + vp.offset.y }
}

export function screenToWorld(screen: Point, vp: Viewport): Point {
  const k = pixelsPerInch(vp)
  return { x: (screen.x - vp.offset.x) / k, y: (screen.y - vp.offset.y) / k }
}

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))
}

/** Zooms by `factor` keeping the world point under `screen` where it is. */
export function zoomAt(vp: Viewport, screen: Point, factor: number): Viewport {
  const scale = clampScale(vp.scale * factor)
  const world = screenToWorld(screen, vp)
  const k = PX_PER_INCH * scale
  return { scale, offset: { x: screen.x - world.x * k, y: screen.y - world.y * k } }
}

export function panBy(vp: Viewport, delta: Point): Viewport {
  return { ...vp, offset: { x: vp.offset.x + delta.x, y: vp.offset.y + delta.y } }
}

/**
 * The viewport that shows the world rectangle `bounds` centred in a `size` stage with `padding`
 * pixels around it, never zooming past 100% (so a tiny plan isn't blown up).
 */
export function fitBounds(
  bounds: { min: Point; max: Point },
  size: { width: number; height: number },
  padding = 40,
): Viewport {
  const w = Math.max(bounds.max.x - bounds.min.x, 1)
  const h = Math.max(bounds.max.y - bounds.min.y, 1)
  const availW = Math.max(size.width - padding * 2, 1)
  const availH = Math.max(size.height - padding * 2, 1)
  const scale = clampScale(Math.min(availW / (w * PX_PER_INCH), availH / (h * PX_PER_INCH), 1))
  const k = PX_PER_INCH * scale
  const cx = (bounds.min.x + bounds.max.x) / 2
  const cy = (bounds.min.y + bounds.max.y) / 2
  return { scale, offset: { x: size.width / 2 - cx * k, y: size.height / 2 - cy * k } }
}

/** Bounding box of points, or undefined if there are none. */
export function boundsOf(points: readonly Point[]): { min: Point; max: Point } | undefined {
  if (points.length === 0) return undefined
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  return {
    min: { x: Math.min(...xs), y: Math.min(...ys) },
    max: { x: Math.max(...xs), y: Math.max(...ys) },
  }
}

/**
 * Grid spacing to draw at this zoom: the snap grid (`base` inches) when it's at least `minPx`
 * apart on screen, otherwise coarser multiples so the grid never turns into a grey wash.
 */
export function visibleGridStep(vp: Viewport, base: number, minPx = 10): number {
  let step = base
  for (const factor of [5, 2, 5, 2, 5]) {
    if (step * pixelsPerInch(vp) >= minPx) break
    step *= factor
  }
  return step
}
