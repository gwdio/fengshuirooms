import type { Point } from '@space-planner/core'

// Where the canvas is on the page, for things that happen outside Konva's events: dragging in
// from the elements panel, and noticing a canvas drag has left the canvas.

let element: HTMLElement | null = null

export function setCanvasElement(el: HTMLElement | null): void {
  element = el
}

/** Converts a viewport (clientX/Y) point to stage pixels. */
export function clientToStage(client: Point): Point | undefined {
  if (!element) return undefined
  const r = element.getBoundingClientRect()
  return { x: client.x - r.left, y: client.y - r.top }
}

export function isOverCanvas(client: Point): boolean {
  if (!element) return false
  const r = element.getBoundingClientRect()
  return client.x >= r.left && client.x <= r.right && client.y >= r.top && client.y <= r.bottom
}
