import type { Point, Wall } from '../model/plan.ts'
import { closestPointOnSegment, distance, nearestWithin, roundPoint } from './geometry.ts'

export type SnapKind = 'endpoint' | 'wall' | 'grid' | 'free'

export interface SnapResult {
  point: Point
  kind: SnapKind
  /** Set when kind is 'wall'. */
  wallId?: string
}

export interface SnapOptions {
  /** Existing corners, plus any in-progress points worth snapping to. */
  endpoints: Point[]
  walls: Wall[]
  /** How close (inches) the raw point must be to snap to an endpoint or wall face. */
  radius: number
  /** Grid spacing in inches, or undefined when grid snap is off. */
  grid?: number
  /** Fallback rounding when grid snap is off. */
  precision: number
}

/**
 * Resolves where a wall endpoint goes. Priority: existing endpoint, then a point along an
 * existing wall, then the grid (if on), then plain rounding to `precision`.
 */
export function snapWallPoint(raw: Point, opts: SnapOptions): SnapResult {
  const corner = nearestWithin(raw, opts.endpoints, opts.radius)
  if (corner) return { point: corner, kind: 'endpoint' }

  const step = opts.grid ?? opts.precision
  let best: SnapResult | undefined
  let bestDist = Infinity
  for (const wall of opts.walls) {
    const { point } = closestPointOnSegment(raw, wall.start, wall.end)
    const d = distance(raw, point)
    if (d > opts.radius + wall.thickness / 2 || d >= bestDist) continue
    bestDist = d
    best = { point: alongWall(point, wall, step), kind: 'wall', wallId: wall.id }
  }
  if (best) return best

  if (opts.grid) return { point: roundPoint(raw, opts.grid), kind: 'grid' }
  return { point: roundPoint(raw, opts.precision), kind: 'free' }
}

/**
 * Rounds a point that lies on `wall` without moving it off the wall. Horizontal and vertical walls
 * round along their length; diagonal walls keep the exact projection.
 */
function alongWall(p: Point, wall: Wall, step: number): Point {
  const { start, end } = wall
  const clamp = (v: number, a: number, b: number) =>
    Math.min(Math.max(v, Math.min(a, b)), Math.max(a, b))
  if (start.y === end.y)
    return { x: clamp(Math.round(p.x / step) * step, start.x, end.x), y: start.y }
  if (start.x === end.x)
    return { x: start.x, y: clamp(Math.round(p.y / step) * step, start.y, end.y) }
  return p
}

export interface TranslationSnap {
  delta: Point
  /** The existing corner a moving endpoint snapped onto, if any. */
  corner?: Point
}

/**
 * Snaps a drag of several points (e.g. a wall's endpoints) by `raw` delta. If any moving point
 * comes within `radius` of a fixed corner, the delta snaps so it lands exactly there; otherwise the
 * delta rounds to the grid (keeping on-grid walls on-grid) or to `precision`.
 */
export function snapTranslation(
  moving: Point[],
  raw: Point,
  opts: Pick<SnapOptions, 'endpoints' | 'radius' | 'grid' | 'precision'>,
): TranslationSnap {
  let best: TranslationSnap | undefined
  let bestDist = opts.radius
  for (const p of moving) {
    const moved = { x: p.x + raw.x, y: p.y + raw.y }
    const corner = nearestWithin(moved, opts.endpoints, bestDist)
    if (!corner) continue
    bestDist = distance(moved, corner)
    best = { delta: { x: corner.x - p.x, y: corner.y - p.y }, corner }
  }
  return best ?? { delta: roundPoint(raw, opts.grid ?? opts.precision) }
}
