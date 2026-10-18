import { useEffect, useState, type RefObject } from 'react'
import { keyboard } from '../input/useKeyboard.ts'
import { clientToStage } from './canvasElement.ts'
import { pan, zoomBy } from './viewport.ts'

// Zoom and pan input on the canvas container (plain DOM listeners, outside Konva):
// - wheel (and trackpad pinch, which arrives as ctrl+wheel) zooms toward the pointer;
// - middle-drag, or left-drag while Space is held, pans.
// Pan presses are stopped in the capture phase so Konva never sees them (no tool action, no drag).

/** How much one wheel "pixel" zooms; 100px of wheel ≈ ×1.16. */
const WHEEL_ZOOM_RATE = 0.0015

/** Returns true while a pan drag is in progress. */
export function useCanvasNavigation(ref: RefObject<HTMLDivElement | null>): boolean {
  const [panning, setPanning] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault() // never scroll or zoom the page
      const at = clientToStage({ x: e.clientX, y: e.clientY })
      if (!at) return
      const lines = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1
      zoomBy(Math.exp(-e.deltaY * lines * WHEEL_ZOOM_RATE), at)
    }

    let last: { x: number; y: number } | null = null
    const isPanPress = (e: MouseEvent) => e.button === 1 || (e.button === 0 && keyboard.isHeld(' '))
    const onPress = (e: MouseEvent) => {
      if (!isPanPress(e)) return
      e.preventDefault() // no autoscroll on middle click
      e.stopPropagation()
      if (e.type === 'mousedown' && last) return // pointerdown already started it
      last = { x: e.clientX, y: e.clientY }
      setPanning(true)
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onRelease)
    }
    const onMove = (e: PointerEvent) => {
      if (!last) return
      pan({ x: e.clientX - last.x, y: e.clientY - last.y })
      last = { x: e.clientX, y: e.clientY }
    }
    const onRelease = () => {
      last = null
      setPanning(false)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onRelease)
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerdown', onPress, true)
    el.addEventListener('mousedown', onPress, true)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onPress, true)
      el.removeEventListener('mousedown', onPress, true)
      onRelease()
    }
  }, [ref])

  return panning
}
