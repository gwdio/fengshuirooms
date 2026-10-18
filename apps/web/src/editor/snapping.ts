import {
  closestPointOnSegment,
  distance,
  endpointsOf,
  isOpening,
  snapTranslation,
  snapWallPoint,
  wallsAtCorner,
  type Point,
  type SnapResult,
  type TranslationSnap,
  type Wall,
} from '@space-planner/core'
import { keyboard } from '../input/useKeyboard.ts'
import { useEditorStore } from '../state/editorStore.ts'
import { getWalls } from '../walls/walls.ts'
import { GRID_INCHES, screenToWorldDistance, toWorld } from './viewport.ts'

// Snapping for wall editing. Reads the live walls, grid setting, and Shift state from stores, so
// these are safe to call from Konva event handlers. Doors and windows are corners you can snap to,
// but never faces to snap onto or lines to merge with (ADR-0013).

const SNAP_RADIUS_PX = 10

function gridStep(): number | undefined {
  return useEditorStore.getState().snapToGrid !== keyboard.isHeld('Shift') ? GRID_INCHES : undefined
}

/** Walls that stay put while `movingWallIds` move. */
function fixedWalls(movingWallIds: readonly string[] = []) {
  const moving = new Set(movingWallIds)
  return getWalls().filter((w) => !moving.has(w.id))
}

export function snapScreenPoint(
  screen: Point,
  opts: { movingWallIds?: readonly string[]; extraEndpoints?: Point[] } = {},
): SnapResult {
  const walls = fixedWalls(opts.movingWallIds)
  return snapWallPoint(toWorld(screen), {
    endpoints: [...endpointsOf(walls), ...(opts.extraEndpoints ?? [])],
    walls: walls.filter((w) => !isOpening(w)),
    radius: screenToWorldDistance(SNAP_RADIUS_PX),
    grid: gridStep(),
    precision: 1,
  })
}

/**
 * Snaps a dragged corner. If an opening moving with it attaches there, the corner stays on the
 * opening's line, so dragging a door's corner resizes the door instead of bending it.
 */
export function snapCorner(
  screen: Point,
  corner: Point,
  movingWallIds: readonly string[],
): SnapResult {
  const snap = snapScreenPoint(screen, { movingWallIds })
  const moving = new Set(movingWallIds)
  const opening = getWalls().find(
    (w) => moving.has(w.id) && isOpening(w) && wallsAtCorner([w], corner).length > 0,
  )
  if (!opening) return snap
  const point = projectOntoLine(snap.point, opening)
  return distance(point, snap.point) < 1e-9 ? snap : { point, kind: 'free' }
}

/** Snaps the delta for dragging whole walls from `startScreen` to `screen`. */
export function snapWallTranslation(
  movingWallIds: readonly string[],
  startScreen: Point,
  screen: Point,
): TranslationSnap {
  const moving = new Set(movingWallIds)
  const movingWalls = getWalls().filter((w) => moving.has(w.id))
  const fixed = fixedWalls(movingWallIds)
  const a = toWorld(startScreen)
  const b = toWorld(screen)
  return snapTranslation(
    movingWalls.flatMap((w) => [w.start, w.end]),
    { x: b.x - a.x, y: b.y - a.y },
    {
      endpoints: endpointsOf(fixed),
      // Lets a wall dropped onto a parallel wall land exactly in line, so the two merge.
      lines: { moving: movingWalls, fixed: fixed.filter((w) => !isOpening(w)) },
      radius: screenToWorldDistance(SNAP_RADIUS_PX),
      grid: gridStep(),
      precision: 1,
    },
  )
}

/** Where an opening's centre goes when slid along its line by a pointer drag. */
export function snapSlide(opening: Wall, startScreen: Point, screen: Point): Point {
  const a = toWorld(startScreen)
  const b = toWorld(screen)
  const len = distance(opening.start, opening.end)
  const dx = (opening.end.x - opening.start.x) / len
  const dy = (opening.end.y - opening.start.y) / len
  const shift = (b.x - a.x) * dx + (b.y - a.y) * dy
  const mid = { x: (opening.start.x + opening.end.x) / 2, y: (opening.start.y + opening.end.y) / 2 }
  return roundAlong({ x: mid.x + dx * shift, y: mid.y + dy * shift }, opening)
}

/** The plain wall under the pointer and where along it an opening would be centred, if any. */
export function findOpeningHost(screen: Point): { hostId: string; center: Point } | undefined {
  const p = toWorld(screen)
  const radius = screenToWorldDistance(SNAP_RADIUS_PX)
  let best: { hostId: string; center: Point } | undefined
  let bestDist = Infinity
  for (const w of getWalls()) {
    if (isOpening(w)) continue
    const { point } = closestPointOnSegment(p, w.start, w.end)
    const d = distance(p, point)
    if (d > radius + w.thickness / 2 || d >= bestDist) continue
    bestDist = d
    best = { hostId: w.id, center: roundAlong(point, w) }
  }
  return best
}

/** Rounds a point on a horizontal/vertical line along it (grid or whole inches); diagonals as-is. */
function roundAlong(p: Point, line: Wall): Point {
  const step = gridStep() ?? 1
  if (line.start.y === line.end.y) return { x: Math.round(p.x / step) * step, y: line.start.y }
  if (line.start.x === line.end.x) return { x: line.start.x, y: Math.round(p.y / step) * step }
  return p
}

function projectOntoLine(p: Point, line: Wall): Point {
  const dx = line.end.x - line.start.x
  const dy = line.end.y - line.start.y
  const t = ((p.x - line.start.x) * dx + (p.y - line.start.y) * dy) / (dx * dx + dy * dy)
  return { x: line.start.x + t * dx, y: line.start.y + t * dy }
}
