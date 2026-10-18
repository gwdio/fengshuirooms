import { formatLength, wallLength, type Point, type Units, type Wall } from '@space-planner/core'
import type Konva from 'konva'
import { Group, Layer, Line } from 'react-konva'
import { useMeta } from '../doc/meta.ts'
import { useEditorStore } from '../state/editorStore.ts'
import { useSelection } from '../state/selectionStore.ts'
import { deleteSegments, getWalls, slideOpening, translateWalls, useWalls } from '../walls/walls.ts'
import { isOverCanvas } from './canvasElement.ts'
import { pendingDeleteIds, previewWalls, setDrag, useEditDrag } from './drag.ts'
import { LengthLabel } from './LengthLabel.tsx'
import { snapSlide, snapWallTranslation } from './snapping.ts'
import { setStageCursor } from './stageCursor.ts'
import { PX_PER_INCH, toScreen } from './viewport.ts'

const WALL_COLOR = '#374151'
const OPENING_COLOR = '#475569'
const WINDOW_COLOR = '#0284c7'
const SELECTED_COLOR = '#0f766e'
const BACKGROUND = '#ffffff'

// Every segment group's first child is a Line spanning start→end; browser tests read geometry
// from it, and its `name` on the group is the segment kind.

export function WallsLayer() {
  const drag = useEditDrag((s) => s.drag)
  const walls = previewWalls(useWalls(), drag)
  const deleting = pendingDeleteIds(drag)
  const { units } = useMeta()
  const selectedIds = useSelection((s) => s.selectedIds)
  const select = useSelection((s) => s.select)
  const selectable = useEditorStore((s) => s.tool === 'select')
  // Openings draw over the plain walls so their gap covers the walls' rounded ends.
  const ordered = [
    ...walls.filter((w) => w.kind === 'wall'),
    ...walls.filter((w) => w.kind !== 'wall'),
  ]

  return (
    <Layer listening={selectable}>
      {ordered.map((wall) => {
        const selected = selectedIds.includes(wall.id)
        const onSelect = (additive: boolean) =>
          select(
            additive
              ? selected
                ? selectedIds.filter((id) => id !== wall.id)
                : [...selectedIds, wall.id]
              : [wall.id],
          )
        const Shape = wall.kind === 'wall' ? WallShape : OpeningShape
        return (
          <Shape
            key={wall.id}
            wall={wall}
            units={units}
            selected={selected}
            deleting={deleting.includes(wall.id)}
            onSelect={onSelect}
          />
        )
      })}
    </Layer>
  )
}

interface ShapeProps {
  wall: Wall
  units: Units
  selected: boolean
  /** Dragged off the canvas: releasing will delete it. */
  deleting: boolean
  onSelect: (additive: boolean) => void
}

const DELETE_COLOR = '#dc2626'

function WallShape({ wall, units, selected, deleting, onSelect }: ShapeProps) {
  const a = toScreen(wall.start)
  const b = toScreen(wall.end)
  return (
    <Group name={wall.kind} opacity={deleting ? 0.35 : 1}>
      <Line
        points={[a.x, a.y, b.x, b.y]}
        stroke={deleting ? DELETE_COLOR : selected ? SELECTED_COLOR : WALL_COLOR}
        strokeWidth={wall.thickness * PX_PER_INCH}
        lineCap="round"
        {...interaction(wall, onSelect)}
      />
      <LengthLabel a={a} b={b} text={formatLength(wallLength(wall), units)} />
    </Group>
  )
}

function OpeningShape({ wall, units, selected, deleting, onSelect }: ShapeProps) {
  const a = toScreen(wall.start)
  const b = toScreen(wall.end)
  const t = wall.thickness * PX_PER_INCH
  const len = Math.hypot(b.x - a.x, b.y - a.y)
  const d = { x: (b.x - a.x) / len, y: (b.y - a.y) / len }
  const n = { x: d.y, y: -d.x } // "left" of start→end on screen (y down)
  const color = deleting
    ? DELETE_COLOR
    : selected
      ? SELECTED_COLOR
      : wall.kind === 'window'
        ? WINDOW_COLOR
        : OPENING_COLOR
  const off = (p: Point, k: number) => [p.x + n.x * k, p.y + n.y * k]
  const jamb = (p: Point) => [...off(p, t / 2), ...off(p, -t / 2)]

  return (
    <Group name={wall.kind} opacity={deleting ? 0.5 : 1}>
      {/* The gap in the wall; also the hit target. */}
      <Line
        points={[a.x, a.y, b.x, b.y]}
        stroke={BACKGROUND}
        strokeWidth={t}
        lineCap="butt"
        {...interaction(wall, onSelect)}
      />
      <Line points={jamb(a)} stroke={color} strokeWidth={2} listening={false} />
      <Line points={jamb(b)} stroke={color} strokeWidth={2} listening={false} />
      {wall.kind === 'window' ? (
        <>
          <Line
            points={[...off(a, t / 4), ...off(b, t / 4)]}
            stroke={color}
            strokeWidth={1.5}
            listening={false}
          />
          <Line
            points={[...off(a, -t / 4), ...off(b, -t / 4)]}
            stroke={color}
            strokeWidth={1.5}
            listening={false}
          />
        </>
      ) : (
        <DoorSwing wall={wall} a={a} b={b} d={d} n={n} len={len} color={color} />
      )}
      <LengthLabel a={a} b={b} text={formatLength(wallLength(wall), units)} color={color} />
    </Group>
  )
}

/** Door leaf drawn open 90° from the hinge, plus the arc its free end sweeps. */
function DoorSwing(props: {
  wall: Wall
  a: Point
  b: Point
  d: Point
  n: Point
  len: number
  color: string
}) {
  const { wall, a, b, d, len, color } = props
  const hinge = wall.hinge === 'end' ? b : a
  const closed = wall.hinge === 'end' ? { x: -d.x, y: -d.y } : d // hinge → other jamb
  const side = wall.swing === 'right' ? -1 : 1
  const open = { x: props.n.x * side, y: props.n.y * side }
  const arc: number[] = []
  const from = Math.atan2(open.y, open.x)
  let to = Math.atan2(closed.y, closed.x)
  // Sweep the 90° between the open leaf and the closed position.
  if (to - from > Math.PI) to -= 2 * Math.PI
  if (from - to > Math.PI) to += 2 * Math.PI
  for (let i = 0; i <= 16; i++) {
    const ang = from + ((to - from) * i) / 16
    arc.push(hinge.x + Math.cos(ang) * len, hinge.y + Math.sin(ang) * len)
  }
  return (
    <>
      <Line
        points={[hinge.x, hinge.y, hinge.x + open.x * len, hinge.y + open.y * len]}
        stroke={color}
        strokeWidth={2}
        listening={false}
      />
      <Line points={arc} stroke={color} strokeWidth={1} dash={[4, 3]} listening={false} />
    </>
  )
}

/**
 * Keeps the drag's `outside` flag in sync with where the pointer really is. Konva stops reporting
 * drag movement once the pointer leaves the stage, so it can't tell us when it comes back.
 */
let stopTrackingOutside = () => {}
function trackOutside() {
  stopTrackingOutside()
  const onMove = (e: PointerEvent | MouseEvent) => {
    const drag = useEditDrag.getState().drag
    if (!drag || drag.kind === 'corner') return
    const outside = !isOverCanvas({ x: e.clientX, y: e.clientY })
    if (outside !== drag.outside) setDrag({ ...drag, outside })
  }
  window.addEventListener('mousemove', onMove, true)
  window.addEventListener('pointermove', onMove, true)
  stopTrackingOutside = () => {
    window.removeEventListener('mousemove', onMove, true)
    window.removeEventListener('pointermove', onMove, true)
    stopTrackingOutside = () => {}
  }
}

/** Pointer position at the last mousedown on a segment; the origin for drags. */
let pressScreen: Point | null = null

/**
 * Selection and dragging shared by every segment. Dragging moves the selection, detaching it from
 * its neighbours, except that a door or window dragged on its own slides along its wall. The node
 * itself stays put (dragBoundFunc); the preview re-renders the walls in place.
 */
function interaction(wall: Wall, onSelect: (additive: boolean) => void) {
  return {
    hitStrokeWidth: Math.max(wall.thickness * PX_PER_INCH, 12),
    draggable: true,
    dragDistance: 3,
    dragBoundFunc: () => ({ x: 0, y: 0 }),
    onClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true
      onSelect(e.evt.shiftKey)
    },
    onMouseDown: (e: Konva.KonvaEventObject<MouseEvent>) => {
      pressScreen = e.target.getStage()?.getPointerPosition() ?? null
    },
    onDragStart: (e: Konva.KonvaEventObject<DragEvent>) => {
      // Measure from the press, not from where Konva decided the drag began (dragDistance
      // later), or the wall would trail the pointer.
      const start = pressScreen ?? e.target.getStage()?.getPointerPosition()
      if (!start) return
      const { selectedIds, select } = useSelection.getState()
      let ids = selectedIds
      if (!ids.includes(wall.id)) {
        ids = e.evt.shiftKey ? [...ids, wall.id] : [wall.id]
        select(ids)
      }
      if (wall.kind !== 'wall' && ids.length === 1) {
        setDrag({ kind: 'slide', id: wall.id, startScreen: start, center: null, outside: false })
      } else {
        setDrag({ kind: 'walls', ids, startScreen: start, snap: null, outside: false })
      }
      trackOutside()
    },
    onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => {
      const drag = useEditDrag.getState().drag
      const pos = e.target.getStage()?.getPointerPosition()
      if (!drag || drag.kind === 'corner' || drag.outside || !pos) return
      if (drag.kind === 'walls') {
        setDrag({ ...drag, snap: snapWallTranslation(drag.ids, drag.startScreen, pos) })
      } else {
        const opening = getWalls().find((w) => w.id === drag.id)
        if (opening) setDrag({ ...drag, center: snapSlide(opening, drag.startScreen, pos) })
      }
    },
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      stopTrackingOutside()
      const drag = useEditDrag.getState().drag
      setDrag(null)
      if (drag && drag.kind !== 'corner' && drag.outside) {
        deleteSegments(drag.kind === 'walls' ? drag.ids : [drag.id])
      } else if (drag?.kind === 'walls' && drag.snap) {
        translateWalls(drag.ids, drag.snap.delta)
      } else if (drag?.kind === 'slide' && drag.center) {
        slideOpening(drag.id, drag.center)
      }
      setStageCursor(e, 'default')
    },
    onMouseEnter: (e: Konva.KonvaEventObject<MouseEvent>) => setStageCursor(e, 'move'),
    onMouseLeave: (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!useEditDrag.getState().drag) setStageCursor(e, 'default')
    },
  }
}
