import { endpointsOf, wallsAtCorner, type Point } from '@space-planner/core'
import { Circle, Layer } from 'react-konva'
import { useSelection } from '../state/selectionStore.ts'
import { getWalls, moveCorner, useWalls } from '../walls/walls.ts'
import { setDrag, useEditDrag } from './drag.ts'
import { SnapMarker } from './SnapMarker.tsx'
import { snapScreenPoint } from './snapping.ts'
import { setStageCursor } from './stageCursor.ts'
import { toScreen } from './viewport.ts'

const HANDLE_COLOR = '#0f766e'

/**
 * Draggable handles on every wall corner (select tool only). Dragging a corner moves every wall
 * there, unless some of those walls are selected: then only the selected ones move, detaching
 * from the rest. Selected walls' corners are drawn filled to show this.
 */
export function CornerHandles() {
  const walls = useWalls()
  const selectedIds = useSelection((s) => s.selectedIds)
  const drag = useEditDrag((s) => s.drag)
  const selectedCorners = new Set(
    walls
      .filter((w) => selectedIds.includes(w.id))
      .flatMap((w) => [w.start, w.end])
      .map(key),
  )

  return (
    <Layer>
      {endpointsOf(walls).map((corner) => (
        <CornerHandle
          key={key(corner)}
          corner={corner}
          detaches={selectedCorners.has(key(corner))}
        />
      ))}
      {drag?.kind === 'corner' &&
        drag.snap &&
        (drag.snap.kind === 'endpoint' || drag.snap.kind === 'wall') && (
          <SnapMarker snap={drag.snap} color={HANDLE_COLOR} />
        )}
      {drag?.kind === 'walls' && drag.snap?.corner && (
        <SnapMarker snap={{ kind: 'endpoint', point: drag.snap.corner }} color={HANDLE_COLOR} />
      )}
    </Layer>
  )
}

function key(p: Point) {
  return `${p.x},${p.y}`
}

/** Walls a drag of `corner` should move: the selected ones there, else all of them. */
function wallsToMove(corner: Point): string[] {
  const { selectedIds } = useSelection.getState()
  const atCorner = wallsAtCorner(getWalls(), corner)
  const selected = atCorner.filter((id) => selectedIds.includes(id))
  return selected.length > 0 ? selected : atCorner
}

function CornerHandle({ corner, detaches }: { corner: Point; detaches: boolean }) {
  const p = toScreen(corner)
  return (
    <Circle
      x={p.x}
      y={p.y}
      radius={5}
      fill={detaches ? HANDLE_COLOR : 'white'}
      stroke={HANDLE_COLOR}
      strokeWidth={1.5}
      hitStrokeWidth={12}
      draggable
      dragDistance={3}
      // Konva calls this with the would-be position; returning the snapped spot makes the handle
      // jump between snap targets. The snap is stored for the live preview.
      dragBoundFunc={(pos) => {
        const drag = useEditDrag.getState().drag
        if (drag?.kind !== 'corner') return pos
        const snap = snapScreenPoint(pos, { movingWallIds: drag.wallIds })
        setDrag({ ...drag, snap })
        return toScreen(snap.point)
      }}
      onDragStart={() =>
        setDrag({ kind: 'corner', from: corner, wallIds: wallsToMove(corner), snap: null })
      }
      onDragEnd={(e) => {
        // Konva moved this node during the drag. Put it back: if this corner still exists after
        // the commit (e.g. a detach left other walls here), React keeps the same node and won't
        // reposition it, since its x/y props didn't change. Handle positions come from the document only.
        e.target.position(p)
        const drag = useEditDrag.getState().drag
        setDrag(null)
        if (drag?.kind === 'corner' && drag.snap)
          moveCorner(drag.from, drag.snap.point, drag.wallIds)
        setStageCursor(e, 'default')
      }}
      onClick={(e) => {
        e.cancelBubble = true // don't clear the selection
      }}
      onMouseEnter={(e) => setStageCursor(e, 'move')}
      onMouseLeave={(e) => {
        if (!useEditDrag.getState().drag) setStageCursor(e, 'default')
      }}
    />
  )
}
