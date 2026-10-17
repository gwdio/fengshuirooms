import { closestPointOnSegment, distance, pointsEqual } from '../geometry/geometry.ts'
import { newId } from './create.ts'
import type { Plan, Point, Room, Wall } from './plan.ts'

/** Typical interior wall, in inches. */
export const DEFAULT_WALL_THICKNESS = 4.5

/** All walls in the plan, across rooms. */
export function allWalls(plan: Plan): Wall[] {
  return plan.rooms.flatMap((r) => r.walls)
}

/** Distinct wall endpoints (corners), for snapping. */
export function wallEndpoints(plan: Plan): Point[] {
  return endpointsOf(allWalls(plan))
}

/** Distinct endpoints of the given walls. */
export function endpointsOf(walls: Wall[]): Point[] {
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

/**
 * Adds a straight wall to the plan's first room, creating the room if needed.
 * Zero-length walls are ignored. Returns a new plan; the input is not mutated.
 */
export function addWall(
  plan: Plan,
  start: Point,
  end: Point,
  thickness = DEFAULT_WALL_THICKNESS,
): { plan: Plan; wall?: Wall } {
  if (distance(start, end) === 0) return { plan }
  const wall: Wall = { id: newId(), start: { ...start }, end: { ...end }, thickness }
  const [first, ...rest] = plan.rooms
  const room: Room = first
    ? { ...first, walls: [...first.walls, wall] }
    : { id: newId(), walls: [wall], features: [], fixedItems: [] }
  return { plan: { ...plan, rooms: [room, ...rest], updatedAt: Date.now() }, wall }
}

/** Removes walls by id from every room. Returns a new plan. */
export function removeWalls(plan: Plan, ids: string[]): Plan {
  const drop = new Set(ids)
  return {
    ...plan,
    rooms: plan.rooms.map((r) => ({ ...r, walls: r.walls.filter((w) => !drop.has(w.id)) })),
    updatedAt: Date.now(),
  }
}

/** Ids of walls with an endpoint exactly at `corner`. */
export function wallsAtCorner(plan: Plan, corner: Point): string[] {
  return allWalls(plan)
    .filter((w) => pointsEqual(w.start, corner) || pointsEqual(w.end, corner))
    .map((w) => w.id)
}

/**
 * Moves a corner: every wall endpoint exactly at `from` goes to `to` — or, with `onlyWallIds`, just
 * those walls' endpoints, detaching them from the rest. Walls that collapse to zero length are
 * removed. Dropping onto another corner merges the two. Returns a new plan.
 */
export function moveCorner(plan: Plan, from: Point, to: Point, onlyWallIds?: string[]): Plan {
  if (pointsEqual(from, to)) return plan
  const only = onlyWallIds && new Set(onlyWallIds)
  const move = (p: Point) => (pointsEqual(p, from) ? { ...to } : p)
  return mapWalls(plan, (w) =>
    only && !only.has(w.id) ? w : { ...w, start: move(w.start), end: move(w.end) },
  )
}

/** Moves the given walls by `delta`. Their shared corners with other walls are left behind. */
export function translateWalls(plan: Plan, ids: string[], delta: Point): Plan {
  if (delta.x === 0 && delta.y === 0) return plan
  const move = new Set(ids)
  const shift = (p: Point) => ({ x: p.x + delta.x, y: p.y + delta.y })
  return mapWalls(plan, (w) =>
    move.has(w.id) ? { ...w, start: shift(w.start), end: shift(w.end) } : w,
  )
}

/** Applies `fn` to every wall, dropping any that end up zero-length. */
function mapWalls(plan: Plan, fn: (w: Wall) => Wall): Plan {
  return {
    ...plan,
    rooms: plan.rooms.map((r) => ({
      ...r,
      walls: r.walls.map(fn).filter((w) => !pointsEqual(w.start, w.end)),
    })),
    updatedAt: Date.now(),
  }
}

/** How close (inches) a corner must be to a wall's line to count as touching it. */
const JUNCTION_EPSILON = 1e-6

/**
 * Splits any wall that has another wall's endpoint lying strictly inside it, so every junction is
 * an ordinary shared corner (ADR-0010). The first piece keeps the original id. Run after every wall
 * edit; returns the same plan object if nothing needed splitting.
 */
export function splitWallsAtJunctions(plan: Plan): Plan {
  const corners = wallEndpoints(plan)
  let changed = false
  const rooms = plan.rooms.map((room) => {
    const walls = room.walls.flatMap((w) => {
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
    return { ...room, walls }
  })
  return changed ? { ...plan, rooms, updatedAt: Date.now() } : plan
}

/**
 * Joins pairs of walls that meet end-to-end in a straight line at a corner no other wall touches,
 * repeating until none are left. Walls with different thicknesses are left alone. The surviving
 * wall keeps the id of whichever came first in the room; `replaced` maps each removed id to it.
 */
export function mergeCollinearWalls(plan: Plan): { plan: Plan; replaced: Map<string, string> } {
  const replaced = new Map<string, string>()
  const rooms = plan.rooms.map((room) => {
    let walls = room.walls
    for (;;) {
      const merge = findMergeablePair(walls)
      if (!merge) break
      const { keep, drop, corner } = merge
      const far = (w: Wall) => (pointsEqual(w.start, corner) ? w.end : w.start)
      const merged = { ...keep, start: { ...far(keep) }, end: { ...far(drop) } }
      walls = walls.filter((w) => w.id !== drop.id).map((w) => (w.id === keep.id ? merged : w))
      for (const [from, to] of replaced) if (to === drop.id) replaced.set(from, keep.id)
      replaced.set(drop.id, keep.id)
    }
    return walls === room.walls ? room : { ...room, walls }
  })
  if (replaced.size === 0) return { plan, replaced }
  return { plan: { ...plan, rooms, updatedAt: Date.now() }, replaced }
}

function findMergeablePair(walls: Wall[]): { keep: Wall; drop: Wall; corner: Point } | undefined {
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
    if (a.thickness !== b.thickness) continue
    const corner = [a.start, a.end].find((p) => pointsEqual(p, b.start) || pointsEqual(p, b.end))!
    if (inline(a, b, corner)) return { keep: a, drop: b, corner }
  }
  return undefined
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
 * Brings walls back to canonical form after any edit: junctions become corners
 * (splitWallsAtJunctions), then inline pairs that no longer need a corner are joined
 * (mergeCollinearWalls). `replaced` maps removed wall ids to the wall that absorbed them.
 */
export function normalizeWalls(plan: Plan): { plan: Plan; replaced: Map<string, string> } {
  return mergeCollinearWalls(splitWallsAtJunctions(plan))
}
