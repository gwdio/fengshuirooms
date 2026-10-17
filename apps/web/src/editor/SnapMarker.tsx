import type { SnapResult } from '@space-planner/core'
import { Circle, Rect } from 'react-konva'
import { toScreen } from './viewport.ts'

/** Ring = existing corner, square = on a wall, dot = grid or free point. */
export function SnapMarker({ snap, color }: { snap: SnapResult; color: string }) {
  const p = toScreen(snap.point)
  if (snap.kind === 'endpoint') {
    return <Circle {...p} radius={7} stroke={color} strokeWidth={2} />
  }
  if (snap.kind === 'wall') {
    return <Rect x={p.x - 5} y={p.y - 5} width={10} height={10} stroke={color} strokeWidth={2} />
  }
  return <Circle {...p} radius={3} fill={color} />
}
