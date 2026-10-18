import { formatLength, wallLength, type Point, type Units, type Wall } from '@space-planner/core'
import { Group, Layer, Line } from 'react-konva'
import { previewWalls, setDrag, useEditDrag } from './drag.ts'
import { snapWallTranslation } from './snapping.ts'
import { setStageCursor } from './stageCursor.ts'
import { LengthLabel } from './LengthLabel.tsx'
import { useMeta } from '../doc/meta.ts'
import { useSelection } from '../state/selectionStore.ts'
import { translateWalls, useWalls } from '../walls/walls.ts'
import { useEditorStore } from '../state/editorStore.ts'
import { PX_PER_INCH, toScreen } from './viewport.ts'

const WALL_COLOR = '#374151'
const SELECTED_COLOR = '#0f766e'

export function WallsLayer() {
  const walls = previewWalls(
    useWalls(),
    useEditDrag((s) => s.drag),
  )
  const { units } = useMeta()
  const selectedIds = useSelection((s) => s.selectedIds)
  const select = useSelection((s) => s.select)
  const selectable = useEditorStore((s) => s.tool === 'select')

  return (
    <Layer listening={selectable}>
      {walls.map((wall) => (
        <WallShape
          key={wall.id}
          wall={wall}
          units={units}
          selected={selectedIds.includes(wall.id)}
          onSelect={(additive) =>
            select(
              additive
                ? selectedIds.includes(wall.id)
                  ? selectedIds.filter((id) => id !== wall.id)
                  : [...selectedIds, wall.id]
                : [wall.id],
            )
          }
        />
      ))}
    </Layer>
  )
}

/** Pointer position at the last mousedown on a wall; the origin for wall drags. */
let pressScreen: Point | null = null

function WallShape(props: {
  wall: Wall
  units: Units
  selected: boolean
  onSelect: (additive: boolean) => void
}) {
  const { wall, units, selected, onSelect } = props
  const a = toScreen(wall.start)
  const b = toScreen(wall.end)
  return (
    <Group>
      <Line
        points={[a.x, a.y, b.x, b.y]}
        stroke={selected ? SELECTED_COLOR : WALL_COLOR}
        strokeWidth={wall.thickness * PX_PER_INCH}
        lineCap="round"
        hitStrokeWidth={Math.max(wall.thickness * PX_PER_INCH, 12)}
        onClick={(e) => {
          e.cancelBubble = true
          onSelect(e.evt.shiftKey)
        }}
        // Dragging moves the selected walls only, detaching them from their neighbours. The node
        // itself stays put (dragBoundFunc); the preview re-renders the walls in place.
        draggable
        dragDistance={3}
        dragBoundFunc={() => ({ x: 0, y: 0 })}
        onMouseDown={(e) => {
          pressScreen = e.target.getStage()?.getPointerPosition() ?? null
        }}
        onDragStart={(e) => {
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
          setDrag({ kind: 'walls', ids, startScreen: start, snap: null })
        }}
        onDragMove={(e) => {
          const drag = useEditDrag.getState().drag
          const pos = e.target.getStage()?.getPointerPosition()
          if (drag?.kind !== 'walls' || !pos) return
          setDrag({ ...drag, snap: snapWallTranslation(drag.ids, drag.startScreen, pos) })
        }}
        onDragEnd={(e) => {
          const drag = useEditDrag.getState().drag
          setDrag(null)
          if (drag?.kind === 'walls' && drag.snap) {
            translateWalls(drag.ids, drag.snap.delta)
          }
          setStageCursor(e, 'default')
        }}
        onMouseEnter={(e) => setStageCursor(e, 'move')}
        onMouseLeave={(e) => {
          if (!useEditDrag.getState().drag) setStageCursor(e, 'default')
        }}
      />
      <LengthLabel a={a} b={b} text={formatLength(wallLength(wall), units)} />
    </Group>
  )
}
