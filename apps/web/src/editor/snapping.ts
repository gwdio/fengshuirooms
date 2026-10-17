import {
  allWalls,
  endpointsOf,
  snapTranslation,
  snapWallPoint,
  type Plan,
  type Point,
  type SnapResult,
  type TranslationSnap,
} from '@space-planner/core'
import { keyboard } from '../input/useKeyboard.ts'
import { useEditorStore } from '../state/editorStore.ts'
import { usePlanStore } from '../state/planStore.ts'
import { GRID_INCHES, screenToWorldDistance, toWorld } from './viewport.ts'

// Snapping for wall editing. Reads the live plan, grid setting, and Shift state from stores, so
// these are safe to call from Konva event handlers.

const SNAP_RADIUS_PX = 10

function gridStep(): number | undefined {
  return useEditorStore.getState().snapToGrid !== keyboard.isHeld('Shift') ? GRID_INCHES : undefined
}

/** Walls that stay put while `movingWallIds` move; only these are snap targets. */
function fixedWalls(plan: Plan, movingWallIds: string[] = []) {
  const moving = new Set(movingWallIds)
  return allWalls(plan).filter((w) => !moving.has(w.id))
}

export function snapScreenPoint(
  screen: Point,
  opts: { movingWallIds?: string[]; extraEndpoints?: Point[] } = {},
): SnapResult {
  const walls = fixedWalls(usePlanStore.getState().plan, opts.movingWallIds)
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
  movingWallIds: string[],
  startScreen: Point,
  screen: Point,
): TranslationSnap {
  const plan = usePlanStore.getState().plan
  const moving = new Set(movingWallIds)
  const movingPoints = allWalls(plan)
    .filter((w) => moving.has(w.id))
    .flatMap((w) => [w.start, w.end])
  const a = toWorld(startScreen)
  const b = toWorld(screen)
  return snapTranslation(
    movingPoints,
    { x: b.x - a.x, y: b.y - a.y },
    {
      endpoints: endpointsOf(fixedWalls(plan, movingWallIds)),
      radius: screenToWorldDistance(SNAP_RADIUS_PX),
      grid: gridStep(),
      precision: 1,
    },
  )
}
