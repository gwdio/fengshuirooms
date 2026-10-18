import { closestPointOnSegment, distance, pointsEqual } from '../geometry/geometry.ts'
import { newId } from './ids.ts'
import {
  isFiniteNumber,
  isObject,
  isPoint,
  isString,
  type CollectionSpec,
} from '../doc/collection.ts'
import type { Point, Wall, WallKind } from './entities.ts'

// Wall geometry operations. All functions are pure: they take a wall list and return a new one
// (or the same array when nothing changed). Order is preserved where it matters (merge keeps the
// earlier wall's id).

/** Typical interior wall, in inches. */
export const DEFAULT_WALL_THICKNESS = 4.5

/** Distinct endpoints (corners) of the given walls. */
export function endpointsOf(walls: readonly Wall[]): Point[] {
  const seen = new Set<string>()
  const out: Point[] = []
  for (const w of walls) {
    for (const p of [w.start, w.end]) {
      const key = `${p.x},${p.y}`
      if (!seen.has(key)) {
        seen.add(key)
        out.push(p)
      }
    }
  }
  return out
}

export function wallLength(w: Wall): number {
  return distance(w.start, w.end)
}

/** A new wall, or undefined if it would be zero-length. */
export function createWall(
  start: Point,
  end: Point,
  thickness = DEFAULT_WALL_THICKNESS,
): Wall | undefined {
  if (distance(start, end) === 0) return undefined
  return { id: newId(), kind: 'wall', start: { ...start }, end: { ...end }, thickness }
}

export function removeWalls(walls: readonly Wall[], ids: readonly string[]): Wall[] {
  const drop = new Set(ids)
  return walls.filter((w) => !drop.has(w.id))
}

/** Ids of walls with an endpoint exactly at `corner`. */
export function wallsAtCorner(walls: readonly Wall[], corner: Point): string[] {
  return walls
    .filter((w) => pointsEqual(w.start, corner) || pointsEqual(w.end, corner))
    .map((w) => w.id)
}

/**
 * Moves a corner: every wall endpoint exactly at `from` goes to `to`. With `onlyWallIds`, just
 * those walls' endpoints move, detaching them from the rest. Walls that collapse to zero length
 * are removed. Dropping onto another corner merges the two.
 */
export function moveCorner(
  walls: readonly Wall[],
  from: Point,
  to: Point,
  onlyWallIds?: readonly string[],
): readonly Wall[] {
  if (pointsEqual(from, to)) return walls
  const only = onlyWallIds && new Set(onlyWallIds)
  const move = (p: Point) => (pointsEqual(p, from) ? { ...to } : p)
  return dropCollapsed(
    walls.map((w) => {
      if (only && !only.has(w.id)) return w
      // Untouched walls must stay the same objects: change detection diffs by reference.
      if (!pointsEqual(w.start, from) && !pointsEqual(w.end, from)) return w
      return { ...w, start: move(w.start), end: move(w.end) }
    }),
  )
}

/** Moves the given walls by `delta`. Their shared corners with other walls are left behind. */
export function translateWalls(
  walls: readonly Wall[],
  ids: readonly string[],
  delta: Point,
): readonly Wall[] {
  if (delta.x === 0 && delta.y === 0) return walls
  const move = new Set(ids)
  const shift = (p: Point) => ({ x: p.x + delta.x, y: p.y + delta.y })
  return dropCollapsed(
    walls.map((w) => (move.has(w.id) ? { ...w, start: shift(w.start), end: shift(w.end) } : w)),
  )
}

function dropCollapsed(walls: Wall[]): Wall[] {
  return walls.filter((w) => !pointsEqual(w.start, w.end))
}

/** How close (inches) a corner must be to a wall's line to count as touching it. */
const JUNCTION_EPSILON = 1e-6

/**
 * Splits any wall that has another wall's endpoint lying strictly inside it, so every junction is
 * an ordinary shared corner (ADR-0010). The first piece keeps the original id.
 */
export function splitWallsAtJunctions(walls: readonly Wall[]): readonly Wall[] {
  const corners = endpointsOf(walls)
  let changed = false
  const out = walls.flatMap((w) => {
    if (w.kind !== 'wall') return [w] // openings are never cut (ADR-0013)
    const cuts = corners
      .filter(
        (p) =>
          distance(p, w.start) > JUNCTION_EPSILON &&
          distance(p, w.end) > JUNCTION_EPSILON &&
          distance(p, closestPointOnSegment(p, w.start, w.end).point) <= JUNCTION_EPSILON,
      )
      .sort((p, q) => distance(w.start, p) - distance(w.start, q))
    if (cuts.length === 0) return [w]
    changed = true
    const stops = [w.start, ...cuts, w.end]
    return stops.slice(1).map((end, i) => ({
      ...w,
      id: i === 0 ? w.id : newId(),
      start: { ...stops[i]! },
      end: { ...end },
    }))
  })
  return changed ? out : walls
}

/**
 * Joins pairs of walls that meet end-to-end in a straight line at a corner no other wall touches,
 * repeating until none are left. Walls with different thicknesses are left alone. The surviving
 * wall keeps the id of whichever came first; `replaced` maps each removed id to it.
 */
export function mergeCollinearWalls(walls: readonly Wall[]): {
  walls: readonly Wall[]
  replaced: Map<string, string>
} {
  const replaced = new Map<string, string>()
  let current = walls
  for (;;) {
    const merge = findMergeablePair(current)
    if (!merge) break
    const { keep, drop, corner } = merge
    const far = (w: Wall) => (pointsEqual(w.start, corner) ? w.end : w.start)
    const merged = { ...keep, start: { ...far(keep) }, end: { ...far(drop) } }
    current = current.filter((w) => w.id !== drop.id).map((w) => (w.id === keep.id ? merged : w))
    for (const [from, to] of replaced) if (to === drop.id) replaced.set(from, keep.id)
    replaced.set(drop.id, keep.id)
  }
  return { walls: current, replaced }
}

function findMergeablePair(
  walls: readonly Wall[],
): { keep: Wall; drop: Wall; corner: Point } | undefined {
  const byCorner = new Map<string, Wall[]>()
  for (const w of walls) {
    for (const p of [w.start, w.end]) {
      const k = `${p.x},${p.y}`
      byCorner.set(k, [...(byCorner.get(k) ?? []), w])
    }
  }
  for (const atCorner of byCorner.values()) {
    if (atCorner.length !== 2) continue
    const [a, b] = atCorner as [Wall, Wall]
    if (!bothPlain(a, b) || a.thickness !== b.thickness) continue
    const corner = [a.start, a.end].find((p) => pointsEqual(p, b.start) || pointsEqual(p, b.end))!
    if (inline(a, b, corner)) return { keep: a, drop: b, corner }
  }
  return undefined
}

/** Merges only ever join plain walls; openings keep their identity and size. */
function bothPlain(a: Wall, b: Wall): boolean {
  return a.kind === 'wall' && b.kind === 'wall'
}

/** True when both walls leave `corner` in exactly opposite directions. */
function inline(a: Wall, b: Wall, corner: Point): boolean {
  const dir = (w: Wall) => {
    const far = pointsEqual(w.start, corner) ? w.end : w.start
    return { x: far.x - corner.x, y: far.y - corner.y }
  }
  const u = dir(a)
  const v = dir(b)
  const cross = u.x * v.y - u.y * v.x
  const dot = u.x * v.x + u.y * v.y
  const scale = Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y)
  return dot < 0 && Math.abs(cross) <= 1e-9 * scale
}

/**
 * Joins walls that lie on top of each other: on the same line, overlapping by more than a point,
 * with equal thickness. The result spans both. The earlier wall keeps its id; `replaced` maps each
 * absorbed id to it.
 */
export function mergeOverlappingWalls(walls: readonly Wall[]): {
  walls: readonly Wall[]
  replaced: Map<string, string>
} {
  const replaced = new Map<string, string>()
  let current = walls
  for (;;) {
    const pair = findOverlappingPair(current)
    if (!pair) break
    const [keep, drop] = pair
    const merged = { ...keep, ...span(keep, drop) }
    current = current.filter((w) => w.id !== drop.id).map((w) => (w.id === keep.id ? merged : w))
    for (const [from, to] of replaced) if (to === drop.id) replaced.set(from, keep.id)
    replaced.set(drop.id, keep.id)
  }
  return { walls: current, replaced }
}

function findOverlappingPair(walls: readonly Wall[]): [Wall, Wall] | undefined {
  for (let i = 0; i < walls.length; i++) {
    for (let j = i + 1; j < walls.length; j++) {
      const a = walls[i]!
      const b = walls[j]!
      if (bothPlain(a, b) && a.thickness === b.thickness && overlapsOnLine(a, b)) return [a, b]
    }
  }
  return undefined
}

/** Position of `p` along `w`'s direction, in inches from `w.start`. */
function along(w: Wall, p: Point): number {
  const len = wallLength(w)
  return (
    ((p.x - w.start.x) * (w.end.x - w.start.x) + (p.y - w.start.y) * (w.end.y - w.start.y)) / len
  )
}

function overlapsOnLine(a: Wall, b: Wall): boolean {
  const onLine = (p: Point) =>
    distance(p, closestPointOnLine(p, a.start, a.end)) <= JUNCTION_EPSILON
  if (!onLine(b.start) || !onLine(b.end)) return false
  const [b0, b1] = [along(a, b.start), along(a, b.end)].sort((x, y) => x - y) as [number, number]
  return Math.min(wallLength(a), b1) - Math.max(0, b0) > JUNCTION_EPSILON
}

function closestPointOnLine(p: Point, a: Point, b: Point): Point {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)
  return { x: a.x + t * dx, y: a.y + t * dy }
}

/** The two extreme endpoints of collinear walls, as copies of existing points (exact coordinates). */
function span(a: Wall, b: Wall): { start: Point; end: Point } {
  const points = [a.start, a.end, b.start, b.end].sort((p, q) => along(a, p) - along(a, q))
  return { start: { ...points[0]! }, end: { ...points[3]! } }
}

/**
 * Canonical form after a local edit: walls lying on top of each other are joined, junctions become
 * corners, then inline pairs that no longer need a corner are joined. `replaced` maps removed wall
 * ids to the wall that absorbed them. Only run on local edits; remote changes are applied as-is
 * (ADR-0011).
 */
export function normalizeWalls(walls: readonly Wall[]): {
  walls: readonly Wall[]
  replaced: Map<string, string>
} {
  const overlap = mergeOverlappingWalls(walls)
  const inline = mergeCollinearWalls(splitWallsAtJunctions(overlap.walls))
  const replaced = new Map(overlap.replaced)
  for (const [from, to] of replaced) replaced.set(from, inline.replaced.get(to) ?? to)
  for (const [from, to] of inline.replaced) replaced.set(from, to)
  return { walls: inline.walls, replaced }
}

const KINDS: readonly WallKind[] = ['wall', 'door', 'window']

export const wallCollection: CollectionSpec<Wall> = {
  name: 'walls',
  version: 2,
  migrations: {
    // v2 added `kind` (doors and windows are wall segments, ADR-0013).
    1: (raw) => (isObject(raw) ? { ...raw, kind: 'wall' } : raw),
  },
  parse(raw) {
    if (!isObject(raw) || !isString(raw.id)) return undefined
    if (!isPoint(raw.start) || !isPoint(raw.end) || !isFiniteNumber(raw.thickness)) return undefined
    if (raw.thickness <= 0 || pointsEqual(raw.start, raw.end)) return undefined
    if (!KINDS.includes(raw.kind as WallKind)) return undefined
    const wall: Wall = {
      id: raw.id,
      kind: raw.kind as WallKind,
      start: { x: raw.start.x, y: raw.start.y },
      end: { x: raw.end.x, y: raw.end.y },
      thickness: raw.thickness,
    }
    if (wall.kind === 'door') {
      wall.hinge = raw.hinge === 'end' ? 'end' : 'start'
      wall.swing = raw.swing === 'right' ? 'right' : 'left'
    }
    return wall
  },
}
