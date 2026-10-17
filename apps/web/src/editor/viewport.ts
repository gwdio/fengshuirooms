import type { Point } from '@space-planner/core'

// Screen pixels per stored inch. Zoom/pan will replace this with a real transform;
// until then everything converts through these two functions.
export const PX_PER_INCH = 4

export function toWorld(screen: Point): Point {
  return { x: screen.x / PX_PER_INCH, y: screen.y / PX_PER_INCH }
}

export function toScreen(world: Point): Point {
  return { x: world.x * PX_PER_INCH, y: world.y * PX_PER_INCH }
}

/** Converts a screen-pixel distance to inches. */
export function screenToWorldDistance(px: number): number {
  return px / PX_PER_INCH
}

/** Visible grid spacing, also the grid-snap step. */
export const GRID_INCHES = 12
