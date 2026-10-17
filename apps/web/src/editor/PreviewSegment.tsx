import { distance, formatLength, type Point, type Units } from '@space-planner/core'
import { Line } from 'react-konva'
import { LengthLabel } from './LengthLabel.tsx'
import { toScreen } from './viewport.ts'

/** Dashed in-progress wall with its live length. */
export function PreviewSegment(props: { from: Point; to: Point; units: Units; color: string }) {
  const a = toScreen(props.from)
  const b = toScreen(props.to)
  return (
    <>
      <Line points={[a.x, a.y, b.x, b.y]} stroke={props.color} strokeWidth={2} dash={[6, 4]} />
      <LengthLabel
        a={a}
        b={b}
        text={formatLength(distance(props.from, props.to), props.units)}
        color={props.color}
      />
    </>
  )
}
