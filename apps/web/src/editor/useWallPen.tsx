import { distance, pointsEqual, type Point, type SnapResult } from '@space-planner/core'
import type Konva from 'konva'
import { useEffect } from 'react'
import { Layer } from 'react-konva'
import { create } from 'zustand'
import { PRIORITY } from '../input/keyboard.ts'
import { useHeldKey, useKeyBindings } from '../input/useKeyboard.ts'
import { useEditorStore } from '../state/editorStore.ts'
import { usePlanStore } from '../state/planStore.ts'
import { PreviewSegment } from './PreviewSegment.tsx'
import { SnapMarker } from './SnapMarker.tsx'
import { snapScreenPoint } from './snapping.ts'

/** Pointer travel (px) between press and release that turns a click into a drag. */
const DRAG_THRESHOLD_PX = 4
const PEN_COLOR = '#0f766e'

interface Chain {
  points: Point[]
  wallIds: string[]
}

interface Press {
  screen: Point
  snap: SnapResult
}

// Pen state lives in a store, not React state: Konva delivers mouse events outside React's event
// system, so a fast mousedown → mouseup can arrive before React re-renders. Handlers must read
// the current state synchronously via getState(), never from a render closure.
interface PenState {
  chain: Chain | null
  press: Press | null
  hover: Point | null
}

const usePen = create<PenState>()(() => ({ chain: null, press: null, hover: null }))
const setPen = usePen.setState
const RESET: PenState = { chain: null, press: null, hover: null }

/** Where a screen point lands for the pen; the chain's start counts as a corner. */
function resolve(screen: Point): SnapResult {
  const start = usePen.getState().chain?.points[0]
  return snapScreenPoint(screen, { extraEndpoints: start ? [start] : [] })
}

function screenPos(e: Konva.KonvaEventObject<MouseEvent>): Point | null {
  return e.target.getStage()?.getPointerPosition() ?? null
}

function commitClick(p: Point) {
  const { chain } = usePen.getState()
  if (!chain) {
    setPen({ chain: { points: [p], wallIds: [] } })
    return
  }
  const last = chain.points.at(-1)!
  // Clicking the last corner again (e.g. a double-click) finishes the chain. Done by position, not
  // Konva's dblclick, which fires for any two clicks within 400ms even far apart.
  if (pointsEqual(p, last)) {
    setPen({ chain: null })
    return
  }
  const prev = chain.points.at(-2)
  if (prev && pointsEqual(p, prev)) return // would retrace the wall just drawn
  const id = usePlanStore.getState().addWall(last, p)
  if (!id) return
  const closes = pointsEqual(p, chain.points[0]!)
  setPen({
    chain: closes ? null : { points: [...chain.points, p], wallIds: [...chain.wallIds, id] },
  })
}

function commitDrag(start: Point, end: Point) {
  const id = usePlanStore.getState().addWall(start, end)
  if (!id) return
  const { chain } = usePen.getState()
  const continues = chain && pointsEqual(start, chain.points.at(-1)!)
  const base = continues ? chain : { points: [start], wallIds: [] }
  const closes = pointsEqual(end, base.points[0]!)
  setPen({
    chain: closes ? null : { points: [...base.points, end], wallIds: [...base.wallIds, id] },
  })
}

function undoLastChainWall() {
  const { chain } = usePen.getState()
  if (!chain) return
  const lastId = chain.wallIds.at(-1)
  if (!lastId) {
    setPen({ chain: null })
    return
  }
  usePlanStore.getState().removeWalls([lastId])
  setPen({ chain: { points: chain.points.slice(0, -1), wallIds: chain.wallIds.slice(0, -1) } })
}

const handlers = {
  onMouseMove(e: Konva.KonvaEventObject<MouseEvent>) {
    setPen({ hover: screenPos(e) })
  },
  onMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    if (e.evt.button !== 0) return
    const screen = screenPos(e)
    if (screen) setPen({ press: { screen, snap: resolve(screen) } })
  },
  onMouseUp(e: Konva.KonvaEventObject<MouseEvent>) {
    const { press } = usePen.getState()
    if (!press) return
    setPen({ press: null })
    const screen = screenPos(e)
    if (!screen) return
    if (distance(press.screen, screen) > DRAG_THRESHOLD_PX) {
      commitDrag(press.snap.point, resolve(screen).point)
    } else {
      commitClick(press.snap.point)
    }
  },
  onMouseLeave() {
    setPen({ press: null, hover: null })
  },
}

/**
 * Wall pen.
 * - Click corners to draw a chain; click the chain's start to close it.
 * - Press-drag-release draws one wall; a following click continues from where it ended.
 * - Double-click (clicking the last corner again) / Enter ends the chain; Backspace removes the chain's last wall; Esc ends or exits.
 * Endpoints snap to existing corners, then onto existing walls, then to the grid (if on; Shift
 * inverts), else to whole inches.
 */
export function useWallPen(active: boolean, onExit: () => void) {
  const { chain, press, hover } = usePen()
  const plan = usePlanStore((s) => s.plan)
  // Subscribed only so the cursor re-snaps when these change; resolve() reads them directly.
  useEditorStore((s) => s.snapToGrid)
  useHeldKey('Shift')

  // Leaving the tool mid-chain keeps the walls drawn so far.
  useEffect(() => {
    if (!active) setPen(RESET)
  }, [active])

  useKeyBindings(
    [
      {
        keys: ['Enter'],
        description: 'Finish wall chain',
        priority: PRIORITY.tool,
        when: () => !!usePen.getState().chain,
        run: () => setPen({ chain: null }),
      },
      {
        keys: ['Escape'],
        description: 'Finish wall chain, or leave the wall tool',
        priority: PRIORITY.tool,
        run: () => (usePen.getState().chain ? setPen({ chain: null }) : onExit()),
      },
      {
        keys: ['Backspace'],
        description: 'Remove the last wall in the chain',
        priority: PRIORITY.tool,
        allowRepeat: true,
        when: () => !!usePen.getState().chain,
        run: undoLastChainWall,
      },
    ],
    active,
  )

  const cursor = active && hover ? resolve(hover) : null
  const dragging = !!press && !!hover && distance(press.screen, hover) > DRAG_THRESHOLD_PX
  const from = dragging ? press.snap.point : chain?.points.at(-1)
  const preview = active && (
    <Layer listening={false}>
      {from && cursor && !pointsEqual(from, cursor.point) && (
        <PreviewSegment from={from} to={cursor.point} units={plan.units} color={PEN_COLOR} />
      )}
      {cursor && <SnapMarker snap={cursor} color={PEN_COLOR} />}
    </Layer>
  )

  return { ...handlers, preview }
}
