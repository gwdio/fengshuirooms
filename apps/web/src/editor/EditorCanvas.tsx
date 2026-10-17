import { useEffect, useRef, useState } from 'react'
import { Layer, Line, Stage } from 'react-konva'

// Screen pixels per stored inch at zoom 1. Zoom/pan will scale the Stage, not this.
const PX_PER_INCH = 4
const GRID_INCHES = 12

export function EditorCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const step = GRID_INCHES * PX_PER_INCH
  const lines = []
  for (let x = 0; x <= size.width; x += step) {
    lines.push(<Line key={`v${x}`} points={[x, 0, x, size.height]} stroke="#e5e7eb" />)
  }
  for (let y = 0; y <= size.height; y += step) {
    lines.push(<Line key={`h${y}`} points={[0, y, size.width, y]} stroke="#e5e7eb" />)
  }

  return (
    <div ref={containerRef} className="h-full w-full bg-white">
      <Stage width={size.width} height={size.height}>
        <Layer listening={false}>{lines}</Layer>
      </Stage>
    </div>
  )
}
