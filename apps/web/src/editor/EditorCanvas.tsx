import { visibleGridStep } from '@space-planner/core'
import { useEffect, useRef, useState } from 'react'
import { Layer, Line, Stage } from 'react-konva'
import { useHeldKey } from '../input/useKeyboard.ts'
import { useEditorStore } from '../state/editorStore.ts'
import { usePaletteDrag } from '../state/paletteDrag.ts'
import { useSelection } from '../state/selectionStore.ts'
import { clientToStage, isOverCanvas, setCanvasElement } from './canvasElement.ts'
import { CornerHandles } from './CornerHandles.tsx'
import { PALETTE } from './palette.ts'
import { useCanvasNavigation } from './useCanvasNavigation.ts'
import { useOpeningTool } from './useOpeningTool.tsx'
import { useWallPen } from './useWallPen.tsx'
import {
  GRID_INCHES,
  pxPerInch,
  setCanvasSize,
  toScreen,
  toWorld,
  useViewport,
} from './viewport.ts'
import { WallsLayer } from './WallsLayer.tsx'
import { ZoomControls } from './ZoomControls.tsx'

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
  const panning = useCanvasNavigation(containerRef)
  const spaceHeld = useHeldKey(' ')

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    setCanvasElement(el)
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const next = { width: entry.contentRect.width, height: entry.contentRect.height }
      setCanvasSize(next)
      setSize(next)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

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

  const cursor = panning
    ? 'grabbing'
    : spaceHeld
      ? 'grab'
      : tool === 'select'
        ? 'default'
        : 'crosshair'

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-white"
      style={{ cursor }}
    >
      <Stage width={size.width} height={size.height} {...handlers}>
        <Grid width={size.width} height={size.height} />
        <WallsLayer />
        {tool === 'select' && <CornerHandles />}
        {pen.preview}
        {opening.preview}
        <PaletteGhost />
      </Stage>
      <ZoomControls />
    </div>
  )
}

/** Grid lines across the visible area, coarsened when zoomed far out. */
function Grid({ width, height }: { width: number; height: number }) {
  const vp = useViewport()
  const step = visibleGridStep(vp, GRID_INCHES)
  const topLeft = toWorld({ x: 0, y: 0 })
  const bottomRight = toWorld({ x: width, y: height })
  const lines = []
  for (let x = Math.floor(topLeft.x / step) * step; x <= bottomRight.x; x += step) {
    const sx = toScreen({ x, y: 0 }).x
    lines.push(<Line key={`v${x}`} points={[sx, 0, sx, height]} stroke="#e5e7eb" />)
  }
  for (let y = Math.floor(topLeft.y / step) * step; y <= bottomRight.y; y += step) {
    const sy = toScreen({ x: 0, y }).y
    lines.push(<Line key={`h${y}`} points={[0, sy, width, sy]} stroke="#e5e7eb" />)
  }
  return <Layer listening={false}>{lines}</Layer>
}

/** Preview of what a drag from the elements panel would drop, while it's over the canvas. */
function PaletteGhost() {
  const drag = usePaletteDrag((s) => s.drag)
  useViewport()
  if (!drag?.dragging || !isOverCanvas(drag.client)) return null
  const stage = clientToStage(drag.client)
  const ghost = stage && PALETTE.find((p) => p.id === drag.entryId)?.ghost(stage)
  if (!ghost) return null
  const a = toScreen(ghost.start)
  const b = toScreen(ghost.end)
  return (
    <Layer listening={false}>
      <Line
        points={[a.x, a.y, b.x, b.y]}
        stroke="#0f766e"
        opacity={0.5}
        strokeWidth={ghost.thickness * pxPerInch() + 4}
        lineCap="round"
      />
    </Layer>
  )
}
