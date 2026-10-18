import type { Point, Wall } from '../model/entities.ts'
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
  /** The fixed segment a moving segment snapped into line with, if any. */
  line?: Segment
}

export interface Segment {
  start: Point
  end: Point
}

/**
 * Snaps a drag of several points (e.g. walls' endpoints) by `raw` delta, in priority order:
 * 1. a moving point within `radius` of a fixed corner lands exactly on it;
 * 2. a moving segment parallel to, overlapping, and within `radius` of a fixed segment lands exactly
 *    on its line (so dropping a wall onto a parallel wall makes them collinear);
 * 3. otherwise the delta rounds to the grid (keeping on-grid walls on-grid) or to `precision`.
 */
export function snapTranslation(
  moving: Point[],
  raw: Point,
  opts: Pick<SnapOptions, 'endpoints' | 'radius' | 'grid' | 'precision'> & {
    lines?: { moving: Segment[]; fixed: Segment[] }
  },
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
  if (best) return best

  const step = opts.grid ?? opts.precision
  const line = opts.lines && snapToLine(opts.lines.moving, opts.lines.fixed, raw, opts.radius, step)
  if (line) return line

  return { delta: roundPoint(raw, step) }
}

function snapToLine(
  moving: Segment[],
  fixed: Segment[],
  raw: Point,
  radius: number,
  step: number,
): TranslationSnap | undefined {
  let best: TranslationSnap | undefined
  let bestOffset = radius
  for (const m of moving) {
    const md = direction(m)
    for (const f of fixed) {
      const fd = direction(f)
      if (!md || !fd || Math.abs(md.x * fd.y - md.y * fd.x) > 1e-9) continue // not parallel
      const normal = { x: -fd.y, y: fd.x }
      const movedStart = { x: m.start.x + raw.x, y: m.start.y + raw.y }
      const offset = (movedStart.x - f.start.x) * normal.x + (movedStart.y - f.start.y) * normal.y
      if (Math.abs(offset) > bestOffset || !overlapsAlong(m, f, raw, fd, radius)) continue
      bestOffset = Math.abs(offset)
      // Remove the perpendicular offset exactly; keep (and round, on axis-aligned lines) the rest.
      let delta = { x: raw.x - offset * normal.x, y: raw.y - offset * normal.y }
      if (f.start.y === f.end.y) {
        delta = { x: Math.round(delta.x / step) * step, y: f.start.y - m.start.y }
      } else if (f.start.x === f.end.x) {
        delta = { x: f.start.x - m.start.x, y: Math.round(delta.y / step) * step }
      }
      best = { delta, line: f }
    }
  }
  return best
}

function direction(s: Segment): Point | undefined {
  const len = distance(s.start, s.end)
  return len === 0 ? undefined : { x: (s.end.x - s.start.x) / len, y: (s.end.y - s.start.y) / len }
}

/** Whether moved `m` and `f` overlap (or nearly touch) when projected onto `f`'s direction. */
function overlapsAlong(m: Segment, f: Segment, raw: Point, fd: Point, slack: number): boolean {
  const proj = (p: Point) => p.x * fd.x + p.y * fd.y
  const [f0, f1] = [proj(f.start), proj(f.end)].sort((a, b) => a - b) as [number, number]
  const shift = proj(raw)
  const [m0, m1] = [proj(m.start) + shift, proj(m.end) + shift].sort((a, b) => a - b) as [
    number,
    number,
  ]
  return Math.min(f1, m1) - Math.max(f0, m0) >= -slack
}
