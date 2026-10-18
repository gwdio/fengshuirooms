import { keyboard } from '../input/useKeyboard.ts'
import { useEditorStore } from '../state/editorStore.ts'

// Space and the Pan tool. Decided on release:
// - a quick tap (released within TAP_MS, without panning) toggles the Pan tool;
// - holding Space pans while held (useCanvasNavigation) and leaves the tool unchanged.

const TAP_MS = 400

let pressedAt: number | null = null
let pannedDuringHold = false

/** Called by canvas navigation whenever a pan drag moves. */
export function notePanned(): void {
  if (pressedAt !== null) pannedDuringHold = true
}

/** Starts watching Space. Call once at startup; returns a stop function. */
export function initPanTool(): () => void {
  let held = keyboard.isHeld(' ')
  return keyboard.subscribe(() => {
    const now = keyboard.isHeld(' ')
    if (now === held) return
    held = now
    if (now) {
      pressedAt = performance.now()
      pannedDuringHold = false
      return
    }
    const quick = pressedAt !== null && performance.now() - pressedAt < TAP_MS
    if (quick && !pannedDuringHold) useEditorStore.getState().togglePan()
    pressedAt = null
  })
}
