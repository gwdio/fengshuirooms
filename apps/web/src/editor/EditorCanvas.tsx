import { useEffect, useRef, useState } from 'react'
import { Layer, Line, Stage } from 'react-konva'
import { useEditorStore } from '../state/editorStore.ts'
import { useSelection } from '../state/selectionStore.ts'
import { CornerHandles } from './CornerHandles.tsx'
import { useOpeningTool } from './useOpeningTool.tsx'
import { useWallPen } from './useWallPen.tsx'
import { WallsLayer } from './WallsLayer.tsx'
import { GRID_INCHES, PX_PER_INCH } from './viewport.ts'

export function EditorCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const tool = useEditorStore((s) => s.tool)
  const setTool = useEditorStore((s) => s.setTool)
  const select = useSelection((s) => s.select)
  const pen = useWallPen(tool === 'wall', () => setTool('select'))
  const opening = useOpeningTool(tool === 'door' || tool === 'window' ? tool : null, () =>
    setTool('select'),
  )

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

  const handlers =
    tool === 'wall'
      ? {
          onMouseDown: pen.onMouseDown,
          onMouseMove: pen.onMouseMove,
          onMouseUp: pen.onMouseUp,
          onMouseLeave: pen.onMouseLeave,
        }
      : tool === 'door' || tool === 'window'
        ? {
            onMouseMove: opening.onMouseMove,
            onMouseLeave: opening.onMouseLeave,
            onClick: opening.onClick,
          }
        : { onClick: () => select([]) } // clicks on walls stop propagation, so this is empty space

  return (
    <div
      ref={containerRef}
      className="h-full w-full bg-white"
      style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }}
    >
      <Stage width={size.width} height={size.height} {...handlers}>
        <Layer listening={false}>{lines}</Layer>
        <WallsLayer />
        {tool === 'select' && <CornerHandles />}
        {pen.preview}
        {opening.preview}
      </Stage>
    </div>
  )
}
