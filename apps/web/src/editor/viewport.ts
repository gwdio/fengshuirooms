import {
  boundsOf,
  endpointsOf,
  DEFAULT_VIEWPORT,
  fitBounds,
  panBy,
  pixelsPerInch,
  screenToWorld,
  worldToScreen,
  zoomAt,
  type Point,
  type Viewport,
} from '@space-planner/core'
import { create } from 'zustand'
import { getWalls } from '../walls/walls.ts'

// The canvas's current zoom and pan. Everything converts between world inches and stage pixels
// through toScreen/toWorld, so zoom and pan apply everywhere. Components that draw with toScreen
// must subscribe (useViewport) so they redraw when the view changes. Handlers just call the
// functions, which read the store directly.

export const useViewport = create<Viewport>()(() => DEFAULT_VIEWPORT)

/** Visible grid base spacing, also the grid-snap step. */
export const GRID_INCHES = 12

export function toWorld(screen: Point): Point {
  return screenToWorld(screen, useViewport.getState())
}

export function toScreen(world: Point): Point {
  return worldToScreen(world, useViewport.getState())
}

/** Stage pixels per inch at the current zoom. */
export function pxPerInch(): number {
  return pixelsPerInch(useViewport.getState())
}

/** Converts a screen-pixel distance to inches at the current zoom. */
export function screenToWorldDistance(px: number): number {
  return px / pxPerInch()
}

let canvasSize = { width: 0, height: 0 }

export function setCanvasSize(size: { width: number; height: number }): void {
  canvasSize = size
}

function center(): Point {
  return { x: canvasSize.width / 2, y: canvasSize.height / 2 }
}

/** Zooms by `factor` around `around` (stage px; default: canvas centre). */
export function zoomBy(factor: number, around: Point = center()): void {
  useViewport.setState(zoomAt(useViewport.getState(), around, factor))
}

export function pan(delta: Point): void {
  useViewport.setState(panBy(useViewport.getState(), delta))
}

/** Back to 100%, keeping the canvas centre where it is. */
export function resetZoom(): void {
  zoomBy(1 / useViewport.getState().scale)
}

/** Frames `points` (e.g. every wall corner); does nothing if there are none. */
export function fitTo(points: readonly Point[]): void {
  const bounds = boundsOf(points)
  if (bounds) useViewport.setState(fitBounds(bounds, canvasSize))
}

/** Frames the whole plan. */
export function fitToPlan(): void {
  fitTo(endpointsOf(getWalls()))
}
