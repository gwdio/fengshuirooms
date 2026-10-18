import { closestPointOnSegment, distance } from '../geometry/geometry.ts'
import { newId } from './ids.ts'
import type { Point, Wall } from './entities.ts'
import { normalizeWalls } from './walls.ts'

// Doors and windows are segments of the wall network (ADR-0013). Placing one cuts a plain wall
// into [wall | opening | wall]; removing one turns it back into plain wall, and normalization
// (mergeCollinearWalls) rejoins the pieces.

export type OpeningKind = 'door' | 'window'

/** Default opening widths, inches. */
export const OPENING_WIDTH: Record<OpeningKind, number> = { door: 36, window: 36 }

export function isOpening(w: Wall): boolean {
  return w.kind !== 'wall'
}

export function midpoint(w: Wall): Point {
  return { x: (w.start.x + w.end.x) / 2, y: (w.start.y + w.end.y) / 2 }
}

export interface PlaceOptions {
  /** Reuse an id (e.g. when sliding an existing opening). */
  id?: string
  hinge?: Wall['hinge']
  swing?: Wall['swing']
}

/**
 * Cuts an opening of `width` into plain wall `hostId`, centred as close to `center` as fits.
 * The host keeps its id for the piece before the opening. Returns undefined if the host isn't a
 * plain wall or is too short.
 */
export function placeOpening(
  walls: readonly Wall[],
  hostId: string,
  center: Point,
  kind: OpeningKind,
  width = OPENING_WIDTH[kind],
  opts: PlaceOptions = {},
): readonly Wall[] | undefined {
  const host = walls.find((w) => w.id === hostId)
  if (!host || host.kind !== 'wall') return undefined
  const len = distance(host.start, host.end)
  if (len < width) return undefined
  const half = width / 2
  const along = Math.min(
    Math.max(closestPointOnSegment(center, host.start, host.end).t * len, half),
    len - half,
  )
  const at = (d: number): Point =>
    d <= 0
      ? { ...host.start }
      : d >= len
        ? { ...host.end }
        : {
            x: host.start.x + ((host.end.x - host.start.x) * d) / len,
            y: host.start.y + ((host.end.y - host.start.y) * d) / len,
          }
  const p0 = at(along - half)
  const p1 = at(along + half)
  const openingId = opts.id ?? newId()
  const opening: Wall = {
    id: openingId,
    kind,
    start: p0,
    end: { ...p1 },
    thickness: host.thickness,
    ...(kind === 'door' ? { hinge: opts.hinge ?? 'start', swing: opts.swing ?? 'left' } : {}),
  }
  const pieces: Wall[] = []
  if (along - half > 0) {
    // If the host already carries the opening's id (it absorbed the opening on removal), give the
    // leading piece a new one so ids stay unique.
    pieces.push({ ...host, id: host.id === openingId ? newId() : host.id, end: { ...p0 } })
  }
  pieces.push(opening)
  if (along + half < len) pieces.push({ ...host, id: newId(), start: { ...p1 } })
  return walls.flatMap((w) => (w.id === hostId ? pieces : [w]))
}

/** Turns openings back into plain wall (normalize afterwards to rejoin them). */
export function openingsToWalls(walls: readonly Wall[], ids: readonly string[]): readonly Wall[] {
  const target = new Set(ids)
  if (!walls.some((w) => target.has(w.id) && isOpening(w))) return walls
  return walls.map((w) => {
    if (!target.has(w.id) || !isOpening(w)) return w
    const { hinge: _h, swing: _s, ...rest } = w
    return { ...rest, kind: 'wall' as const }
  })
}

/**
 * Moves an opening along its wall line so it's centred as close to `center` as fits, keeping its
 * id, kind, width, and door settings. Returns undefined if it can't be placed there.
 */
export function slideOpening(
  walls: readonly Wall[],
  id: string,
  center: Point,
): readonly Wall[] | undefined {
  const opening = walls.find((w) => w.id === id)
  if (!opening || !isOpening(opening)) return undefined
  const width = distance(opening.start, opening.end)
  const { walls: merged } = normalizeWalls(openingsToWalls(walls, [id]))
  const target = projectOntoLine(center, opening.start, opening.end)
  // The nearest plain wall on the opening's line; placeOpening clamps the opening into it, so
  // dragging past the end stops at the end.
  let host: Wall | undefined
  let best = Infinity
  for (const w of merged) {
    if (w.kind !== 'wall' || !sameLine(w, opening)) continue
    const d = distance(target, closestPointOnSegment(target, w.start, w.end).point)
    if (d < best) {
      best = d
      host = w
    }
  }
  if (!host) return undefined
  return placeOpening(merged, host.id, target, opening.kind as OpeningKind, width, {
    id,
    hinge: opening.hinge,
    swing: opening.swing,
  })
}

/** Flips a door's hinge end or swing side. */
export function flipDoor(
  walls: readonly Wall[],
  id: string,
  what: 'hinge' | 'swing',
): readonly Wall[] {
  return walls.map((w) => {
    if (w.id !== id || w.kind !== 'door') return w
    return what === 'hinge'
      ? { ...w, hinge: w.hinge === 'end' ? 'start' : 'end' }
      : { ...w, swing: w.swing === 'right' ? 'left' : 'right' }
  })
}

function projectOntoLine(p: Point, a: Point, b: Point): Point {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)
  return { x: a.x + t * dx, y: a.y + t * dy }
}

function sameLine(w: Wall, o: Wall): boolean {
  const onLine = (p: Point) => distance(p, projectOntoLine(p, o.start, o.end)) < 1e-6
  return onLine(w.start) && onLine(w.end)
}
