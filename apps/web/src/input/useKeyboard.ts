import { useEffect, useRef, useSyncExternalStore } from 'react'
import { KeyboardEngine, type Binding } from './keyboard.ts'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

/** The app's single keyboard engine. */
export const keyboard = new KeyboardEngine(isMac)

/**
 * Attaches the engine to the window. Call once at the app root. Uses the capture phase so
 * shortcuts run before anything else on the page can swallow the event.
 */
export function useKeyboardRoot() {
  useEffect(() => {
    const down = (e: KeyboardEvent) => keyboard.handleKeyDown(e)
    const up = (e: KeyboardEvent) => keyboard.handleKeyUp(e)
    const blur = () => keyboard.releaseAll()
    window.addEventListener('keydown', down, { capture: true })
    window.addEventListener('keyup', up, { capture: true })
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down, { capture: true })
      window.removeEventListener('keyup', up, { capture: true })
      window.removeEventListener('blur', blur)
    }
  }, [])
}

/**
 * Registers bindings while the component is mounted (and `enabled`). Handlers and `when` always
 * see the latest render's closures, so callers don't need to manage dependency arrays.
 */
export function useKeyBindings(bindings: Binding[], enabled = true) {
  const latest = useRef(bindings)
  useEffect(() => {
    latest.current = bindings
  })
  // Re-register only when the set of chords changes, not on every render.
  const signature = bindings.map((b) => `${b.keys.join(',')}@${b.priority ?? 0}`).join('|')
  useEffect(() => {
    if (!enabled) return
    const offs = latest.current.map((_, i) =>
      keyboard.register({
        ...latest.current[i]!,
        run: (e) => latest.current[i]!.run(e),
        when: () => latest.current[i]!.when?.() ?? true,
      }),
    )
    return () => offs.forEach((off) => off())
  }, [enabled, signature])
}

/** Whether a modifier key (e.g. "Shift") is currently held. */
export function useHeldKey(key: string): boolean {
  return useSyncExternalStore(
    (cb) => keyboard.subscribe(cb),
    () => keyboard.isHeld(key),
  )
}
