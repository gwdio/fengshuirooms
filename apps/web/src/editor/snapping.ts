import {
  endpointsOf,
  snapTranslation,
  snapWallPoint,
  type Point,
  type SnapResult,
  type TranslationSnap,
} from '@space-planner/core'
import { keyboard } from '../input/useKeyboard.ts'
import { useEditorStore } from '../state/editorStore.ts'
import { getWalls } from '../walls/walls.ts'
import { GRID_INCHES, screenToWorldDistance, toWorld } from './viewport.ts'

// Snapping for wall editing. Reads the live walls, grid setting, and Shift state from stores, so
// these are safe to call from Konva event handlers.

const SNAP_RADIUS_PX = 10

function gridStep(): number | undefined {
  return useEditorStore.getState().snapToGrid !== keyboard.isHeld('Shift') ? GRID_INCHES : undefined
}

/** Walls that stay put while `movingWallIds` move; only these are snap targets. */
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
    walls,
    radius: screenToWorldDistance(SNAP_RADIUS_PX),
    grid: gridStep(),
    precision: 1,
  })
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
      lines: { moving: movingWalls, fixed },
      radius: screenToWorldDistance(SNAP_RADIUS_PX),
      grid: gridStep(),
      precision: 1,
    },
  )
}
