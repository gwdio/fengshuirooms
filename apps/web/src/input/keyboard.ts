// Keyboard engine. Every shortcut in the app goes through here instead of adding its own
// window listener. DOM-free so it can be unit-tested; see useKeyboard.ts for the React/DOM binding.
//
// - Bindings declare chords like "w", "Mod+z", "Shift+Enter". Mod = Cmd on macOS, Ctrl elsewhere.
//   Modifiers match exactly: "w" does not fire on Shift+W.
// - When several bindings match, the highest `priority` wins, then the most recently registered.
//   A handler can return `false` to decline, and the next candidate gets the event.
// - A handled event is preventDefault()ed so the browser (find-as-you-type, button activation,
//   back-navigation on Backspace) never sees it.
// - Keys are ignored while typing in inputs or during IME composition, and auto-repeat is ignored
//   unless a binding opts in.
// - Held keys (e.g. Shift for grid-snap inversion) are tracked and cleared on window blur.

export interface KeyEventLike {
  key: string
  code: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  shiftKey: boolean
  repeat: boolean
  isComposing?: boolean
  target?: unknown
  preventDefault(): void
  stopPropagation(): void
}

export interface Binding {
  /** Chords, e.g. ["Delete", "Backspace"]. */
  keys: string[]
  run: (e: KeyEventLike) => void | boolean
  /** Shown in help/hints later. */
  description?: string
  /** Higher wins. Use PRIORITY constants. */
  priority?: number
  /** Return false to make the binding inactive for this event. */
  when?: () => boolean
  allowRepeat?: boolean
  allowInInput?: boolean
}

export const PRIORITY = {
  global: 0,
  /** Active tool's bindings override global ones. */
  tool: 10,
  /** Modal UI (dialogs, inline editors) overrides everything. */
  modal: 100,
} as const

interface Chord {
  key: string
  mod: boolean
  shift: boolean
  alt: boolean
}

const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta'])

export function parseChord(chord: string): Chord {
  const parts = chord.split('+')
  const key = parts.pop()
  if (!key) throw new Error(`Invalid chord: "${chord}"`)
  const mods = new Set(parts.map((p) => p.toLowerCase()))
  for (const m of mods) {
    if (m !== 'mod' && m !== 'shift' && m !== 'alt')
      throw new Error(`Unknown modifier in "${chord}"`)
  }
  return {
    key: normalizeKeyName(key),
    mod: mods.has('mod'),
    shift: mods.has('shift'),
    alt: mods.has('alt'),
  }
}

function normalizeKeyName(key: string): string {
  return key.length === 1 ? key.toLowerCase() : key
}

/**
 * The event's key in chord terms. Letters are lowercased (CapsLock/Shift don't change identity);
 * on non-Latin layouts a letter key falls back to its physical position (KeyW → "w").
 */
export function eventKey(e: Pick<KeyEventLike, 'key' | 'code'>): string {
  if (e.key.length === 1 && /[a-z]/i.test(e.key)) return e.key.toLowerCase()
  if (e.key.length === 1 && /^Key[A-Z]$/.test(e.code)) return e.code.slice(3).toLowerCase()
  return normalizeKeyName(e.key)
}

export function isEditableTarget(target: unknown): boolean {
  if (!target || typeof target !== 'object') return false
  const el = target as { tagName?: string; isContentEditable?: boolean; type?: string }
  if (el.isContentEditable) return true
  if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true
  if (el.tagName === 'INPUT') {
    const nonText = ['button', 'checkbox', 'radio', 'range', 'submit', 'reset', 'color', 'file']
    return !nonText.includes(el.type ?? 'text')
  }
  return false
}

export class KeyboardEngine {
  private bindings: { binding: Binding; chords: Chord[]; order: number }[] = []
  private nextOrder = 0
  private held = new Set<string>()
  private listeners = new Set<() => void>()

  private readonly isMac: boolean

  constructor(isMac = false) {
    this.isMac = isMac
  }

  /** Registers a binding; returns a function that removes it. */
  register(binding: Binding): () => void {
    const entry = { binding, chords: binding.keys.map(parseChord), order: this.nextOrder++ }
    this.bindings.push(entry)
    return () => {
      this.bindings = this.bindings.filter((b) => b !== entry)
    }
  }

  /** Returns true if a binding handled the event. */
  handleKeyDown(e: KeyEventLike): boolean {
    this.setHeld(e.key, true)
    if (e.isComposing || MODIFIER_KEYS.has(e.key)) return false
    const editable = isEditableTarget(e.target)
    const candidates = this.bindings
      .filter(({ binding, chords }) => {
        if (editable && !binding.allowInInput) return false
        if (e.repeat && !binding.allowRepeat) return false
        if (!chords.some((c) => this.matches(c, e))) return false
        return binding.when ? binding.when() : true
      })
      .sort((a, b) => (b.binding.priority ?? 0) - (a.binding.priority ?? 0) || b.order - a.order)
    for (const { binding } of candidates) {
      if (binding.run(e) === false) continue
      e.preventDefault()
      e.stopPropagation()
      return true
    }
    return false
  }

  handleKeyUp(e: Pick<KeyEventLike, 'key'>): void {
    this.setHeld(e.key, false)
  }

  /** Call on window blur: keyups that happen while unfocused never arrive. */
  releaseAll(): void {
    if (this.held.size === 0) return
    this.held.clear()
    this.emit()
  }

  isHeld(key: string): boolean {
    return this.held.has(key)
  }

  /** Notified whenever the set of held modifier keys changes. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private matches(c: Chord, e: KeyEventLike): boolean {
    const mod = this.isMac ? e.metaKey : e.ctrlKey
    const otherMod = this.isMac ? e.ctrlKey : e.metaKey
    return (
      c.key === eventKey(e) &&
      c.mod === mod &&
      !otherMod &&
      c.shift === e.shiftKey &&
      c.alt === e.altKey
    )
  }

  private setHeld(key: string, down: boolean) {
    // Only modifiers are tracked; that's all anything needs so far.
    if (!MODIFIER_KEYS.has(key)) return
    if (down === this.held.has(key)) return
    if (down) this.held.add(key)
    else this.held.delete(key)
    this.emit()
  }

  private emit() {
    for (const l of this.listeners) l()
  }
}
