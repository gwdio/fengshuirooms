import type { Point } from '../model/plan.ts'

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

export function pointsEqual(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y
}

/** Rounds both coordinates to the nearest multiple of `step`. */
export function roundPoint(p: Point, step: number): Point {
  return { x: Math.round(p.x / step) * step, y: Math.round(p.y / step) * step }
}

/** Returns the closest candidate within `radius` of `p`, or undefined. */
export function nearestWithin(p: Point, candidates: Point[], radius: number): Point | undefined {
  let best: Point | undefined
  let bestDist = radius
  for (const c of candidates) {
    const d = distance(p, c)
    if (d <= bestDist) {
      best = c
      bestDist = d
    }
  }
  return best
}

/** Closest point to `p` on segment `a`–`b`, and its parameter `t` in [0, 1]. */
export function closestPointOnSegment(p: Point, a: Point, b: Point): { point: Point; t: number } {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return { point: { ...a }, t: 0 }
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq))
  return { point: { x: a.x + t * dx, y: a.y + t * dy }, t }
}
