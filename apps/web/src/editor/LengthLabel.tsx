import { Text } from 'react-konva'

/** Length text centered on a segment, offset to one side, kept upright. */
export function LengthLabel(props: {
  a: { x: number; y: number }
  b: { x: number; y: number }
  text: string
  color?: string
}) {
  const { a, b, text, color = '#6b7280' } = props
  let angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI
  if (angle > 90) angle -= 180
  if (angle <= -90) angle += 180
  const width = 80
  return (
    <Text
      x={(a.x + b.x) / 2}
      y={(a.y + b.y) / 2}
      rotation={angle}
      offsetX={width / 2}
      offsetY={24}
      width={width}
      align="center"
      text={text}
      fontSize={12}
      fill={color}
      listening={false}
    />
  )
}
