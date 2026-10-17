import { describe, expect, it, vi } from 'vitest'
import { eventKey, KeyboardEngine, parseChord, PRIORITY, type KeyEventLike } from './keyboard.ts'

function key(k: string, opts: Partial<KeyEventLike> = {}): KeyEventLike & { prevented: boolean } {
  const e = {
    key: k,
    code: k.length === 1 ? `Key${k.toUpperCase()}` : k,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    repeat: false,
    prevented: false,
    preventDefault() {
      e.prevented = true
    },
    stopPropagation() {},
    ...opts,
  }
  return e
}

describe('parseChord', () => {
  it('parses modifiers and lowercases letters', () => {
    expect(parseChord('Mod+Shift+Z')).toEqual({ key: 'z', mod: true, shift: true, alt: false })
    expect(parseChord('Escape')).toEqual({ key: 'Escape', mod: false, shift: false, alt: false })
  })
  it('rejects unknown modifiers', () => {
    expect(() => parseChord('Hyper+x')).toThrow('Unknown modifier')
  })
})

describe('eventKey', () => {
  it('ignores case from CapsLock', () => {
    expect(eventKey({ key: 'W', code: 'KeyW' })).toBe('w')
  })
  it('falls back to physical key on non-Latin layouts', () => {
    expect(eventKey({ key: 'ц', code: 'KeyW' })).toBe('w')
  })
})

describe('KeyboardEngine', () => {
  it('runs a matching binding and prevents default', () => {
    const kb = new KeyboardEngine()
    const run = vi.fn<() => void>()
    kb.register({ keys: ['w'], run })
    const e = key('w')
    expect(kb.handleKeyDown(e)).toBe(true)
    expect(run).toHaveBeenCalledOnce()
    expect(e.prevented).toBe(true)
  })

  it('leaves unhandled keys alone', () => {
    const kb = new KeyboardEngine()
    kb.register({ keys: ['w'], run: () => {} })
    const e = key('q')
    expect(kb.handleKeyDown(e)).toBe(false)
    expect(e.prevented).toBe(false)
  })

  it('matches modifiers exactly', () => {
    const kb = new KeyboardEngine()
    const run = vi.fn<() => void>()
    kb.register({ keys: ['w'], run })
    kb.handleKeyDown(key('W', { shiftKey: true }))
    kb.handleKeyDown(key('w', { ctrlKey: true }))
    expect(run).not.toHaveBeenCalled()
  })

  it('maps Mod to Ctrl, or Cmd on macOS', () => {
    const pc = new KeyboardEngine(false)
    const mac = new KeyboardEngine(true)
    const pcRun = vi.fn<() => void>()
    const macRun = vi.fn<() => void>()
    pc.register({ keys: ['Mod+z'], run: pcRun })
    mac.register({ keys: ['Mod+z'], run: macRun })
    pc.handleKeyDown(key('z', { ctrlKey: true }))
    mac.handleKeyDown(key('z', { ctrlKey: true }))
    mac.handleKeyDown(key('z', { metaKey: true }))
    expect(pcRun).toHaveBeenCalledOnce()
    expect(macRun).toHaveBeenCalledOnce()
  })

  it('prefers higher priority, then most recent, and lets handlers decline', () => {
    const kb = new KeyboardEngine()
    const calls: string[] = []
    kb.register({ keys: ['Escape'], run: () => void calls.push('global') })
    kb.register({
      keys: ['Escape'],
      priority: PRIORITY.tool,
      run: () => (calls.push('tool'), false),
    })
    kb.register({ keys: ['Escape'], run: () => void calls.push('global-newer') })
    kb.handleKeyDown(key('Escape'))
    expect(calls).toEqual(['tool', 'global-newer'])
  })

  it('skips bindings whose `when` is false', () => {
    const kb = new KeyboardEngine()
    const run = vi.fn<() => void>()
    kb.register({ keys: ['Delete'], when: () => false, run })
    expect(kb.handleKeyDown(key('Delete'))).toBe(false)
    expect(run).not.toHaveBeenCalled()
  })

  it('ignores typing in text inputs unless allowed', () => {
    const kb = new KeyboardEngine()
    const blocked = vi.fn<() => void>()
    const allowed = vi.fn<() => void>()
    kb.register({ keys: ['w'], run: blocked })
    kb.register({ keys: ['Escape'], run: allowed, allowInInput: true })
    const input = { tagName: 'INPUT', type: 'text' }
    kb.handleKeyDown(key('w', { target: input }))
    kb.handleKeyDown(key('Escape', { target: input }))
    kb.handleKeyDown(key('w', { target: { tagName: 'INPUT', type: 'checkbox' } }))
    expect(blocked).toHaveBeenCalledOnce() // only the checkbox one
    expect(allowed).toHaveBeenCalledOnce()
  })

  it('ignores auto-repeat and IME composition by default', () => {
    const kb = new KeyboardEngine()
    const run = vi.fn<() => void>()
    kb.register({ keys: ['w'], run })
    kb.handleKeyDown(key('w', { repeat: true }))
    kb.handleKeyDown(key('w', { isComposing: true }))
    expect(run).not.toHaveBeenCalled()
  })

  it('unregisters', () => {
    const kb = new KeyboardEngine()
    const run = vi.fn<() => void>()
    const off = kb.register({ keys: ['w'], run })
    off()
    kb.handleKeyDown(key('w'))
    expect(run).not.toHaveBeenCalled()
  })

  it('tracks held modifiers and clears them on blur', () => {
    const kb = new KeyboardEngine()
    const changed = vi.fn<() => void>()
    kb.subscribe(changed)
    kb.handleKeyDown(key('Shift', { shiftKey: true }))
    kb.handleKeyDown(key('Shift', { shiftKey: true, repeat: true }))
    expect(kb.isHeld('Shift')).toBe(true)
    expect(changed).toHaveBeenCalledOnce()
    kb.releaseAll()
    expect(kb.isHeld('Shift')).toBe(false)
    expect(changed).toHaveBeenCalledTimes(2)
  })
})
