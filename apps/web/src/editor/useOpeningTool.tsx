import { placeOpening as placeOpeningIn, type OpeningKind, type Point } from '@space-planner/core'
import type Konva from 'konva'
import { Layer, Line } from 'react-konva'
import { create } from 'zustand'
import { PRIORITY } from '../input/keyboard.ts'
import { useHeldKey, useKeyBindings } from '../input/useKeyboard.ts'
import { useEditorStore } from '../state/editorStore.ts'
import { getWalls, placeOpening, useWalls } from '../walls/walls.ts'
import { findOpeningHost } from './snapping.ts'
import { PX_PER_INCH, toScreen } from './viewport.ts'

// Door/window tool: hover a wall to preview the opening, click to cut it in. Stays active for
// more placements; Escape returns to select. Hover state is in a store so the Konva handlers read
// it synchronously (see frontend.md, "Canvas event handlers").

const GHOST_COLOR = '#0f766e'

const useHover = create<{ screen: Point | null }>()(() => ({ screen: null }))

const handlers = {
  onMouseMove(e: Konva.KonvaEventObject<MouseEvent>) {
    useHover.setState({ screen: e.target.getStage()?.getPointerPosition() ?? null })
  },
  onMouseLeave() {
    useHover.setState({ screen: null })
  },
}

export function useOpeningTool(kind: OpeningKind | null, onExit: () => void) {
  const screen = useHover((s) => s.screen)
  useWalls() // re-render the ghost when walls change
  useEditorStore((s) => s.snapToGrid)
  useHeldKey('Shift')

  useKeyBindings(
    [
      {
        keys: ['Escape'],
        description: 'Leave the door/window tool',
        priority: PRIORITY.tool,
        run: onExit,
      },
    ],
    kind !== null,
  )

  const target = kind && screen ? findOpeningHost(screen) : undefined
  const ghost =
    kind && target
      ? placeOpeningIn(getWalls(), target.hostId, target.center, kind)?.find(
          (w) => w.kind === kind && !getWalls().some((old) => old.id === w.id),
        )
      : undefined

  function onClick(e: Konva.KonvaEventObject<MouseEvent>) {
    if (e.evt.button !== 0 || !kind) return
    const pos = e.target.getStage()?.getPointerPosition()
    const hit = pos && findOpeningHost(pos)
    if (hit) placeOpening(hit.hostId, hit.center, kind)
  }

  const preview = ghost && (
    <Layer listening={false}>
      <Line
        points={[...Object.values(toScreen(ghost.start)), ...Object.values(toScreen(ghost.end))]}
        stroke={GHOST_COLOR}
        opacity={0.5}
        strokeWidth={ghost.thickness * PX_PER_INCH + 4}
      />
    </Layer>
  )

  return { ...handlers, onClick, preview }
}
