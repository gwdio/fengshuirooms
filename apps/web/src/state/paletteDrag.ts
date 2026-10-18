import type { Point } from '@space-planner/core'
import { create } from 'zustand'
import { clientToStage, isOverCanvas } from '../editor/canvasElement.ts'
import { dropAndSelect, PALETTE } from '../editor/palette.ts'
import { useEditorStore } from './editorStore.ts'

// Dragging an entry out of the elements panel. Pointer events (not HTML5 drag-and-drop) so it
// works the same for mouse and touch. A press that barely moves is a click: it picks the tool.

const CLICK_SLOP_PX = 4

interface PaletteDrag {
  entryId: string
  /** Pointer position in viewport coordinates. */
  client: Point
  /** True once the pointer has moved far enough to count as a drag. */
  dragging: boolean
}

export const usePaletteDrag = create<{ drag: PaletteDrag | null }>()(() => ({ drag: null }))

export function beginPaletteDrag(entryId: string, start: Point): void {
  usePaletteDrag.setState({ drag: { entryId, client: start, dragging: false } })

  const move = (e: PointerEvent) => {
    const drag = usePaletteDrag.getState().drag
    if (!drag) return
    const client = { x: e.clientX, y: e.clientY }
    const dragging =
      drag.dragging || Math.hypot(client.x - start.x, client.y - start.y) > CLICK_SLOP_PX
    usePaletteDrag.setState({ drag: { ...drag, client, dragging } })
  }
  const up = (e: PointerEvent) => {
    stop()
    const entry = PALETTE.find((p) => p.id === entryId)
    const drag = usePaletteDrag.getState().drag
    usePaletteDrag.setState({ drag: null })
    if (!entry || !drag) return
    if (!drag.dragging) {
      useEditorStore.getState().setTool(entry.tool)
      return
    }
    const client = { x: e.clientX, y: e.clientY }
    const stage = isOverCanvas(client) ? clientToStage(client) : undefined
    if (stage) dropAndSelect(entry, stage)
  }
  const stop = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    window.removeEventListener('pointercancel', cancel)
  }
  const cancel = () => {
    stop()
    usePaletteDrag.setState({ drag: null })
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
  window.addEventListener('pointercancel', cancel)
  cancelCurrent = cancel
}

let cancelCurrent: (() => void) | undefined

/** Abandons an in-progress palette drag (e.g. Escape). */
export function cancelPaletteDrag(): void {
  cancelCurrent?.()
  cancelCurrent = undefined
}
