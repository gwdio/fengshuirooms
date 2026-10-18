import { redo, undo, useHistory } from '../doc/history.ts'
import { useHeldKey } from '../input/useKeyboard.ts'
import { useEditorStore, type Tool } from '../state/editorStore.ts'

// Wall, door, and window are picked from the elements panel; the toolbar keeps Select and
// explains whatever tool is active.
const HINTS: Record<Tool, string> = {
  select:
    'P places the last used element · click to select · drag a wall to move it on its own · drag a door/window to slide it · drag a corner to move every wall there (only the selected ones, if any) · Delete or drag off the canvas removes (doors/windows become wall)',
  wall: 'Click corners or drag a wall · start or end on any wall · click the start to close · double-click / Enter to finish · Backspace undoes last wall · Esc exits',
  door: 'Click a wall to add a door · Esc exits',
  window: 'Click a wall to add a window · Esc exits',
}

export function Toolbar() {
  const tool = useEditorStore((s) => s.tool)
  const setTool = useEditorStore((s) => s.setTool)
  const snapToGrid = useEditorStore((s) => s.snapToGrid)
  const toggleSnapToGrid = useEditorStore((s) => s.toggleSnapToGrid)
  // What snapping will actually do right now, with Shift's inversion applied.
  const gridActive = snapToGrid !== useHeldKey('Shift')
  const hint = HINTS[tool]

  return (
    <div className="flex min-w-0 items-center gap-3">
      <button
        type="button"
        title="Select (V)"
        aria-pressed={tool === 'select'}
        onClick={() => setTool('select')}
        className={`shrink-0 rounded border px-2 py-1 text-sm ${
          tool === 'select'
            ? 'border-teal-700 bg-teal-700 text-white'
            : 'border-gray-300 hover:bg-gray-100'
        }`}
      >
        Select <span className="opacity-60">V</span>
      </button>
      <button
        type="button"
        title="Snap to grid (G to toggle, hold Shift to invert)"
        aria-pressed={snapToGrid}
        onClick={toggleSnapToGrid}
        className={`shrink-0 rounded border px-2 py-1 text-sm ${
          gridActive ? 'border-teal-700 text-teal-800' : 'border-gray-300 text-gray-500'
        }`}
      >
        Grid snap {gridActive ? 'on' : 'off'} <span className="opacity-60">G</span>
      </button>
      <HistoryButtons />
      <p className="truncate text-xs text-gray-500">{hint}</p>
    </div>
  )
}

const MOD =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl+'

function HistoryButtons() {
  const { canUndo, canRedo, undoLabel, redoLabel } = useHistory()
  const button =
    'rounded border border-gray-300 px-2 py-1 text-sm enabled:hover:bg-gray-100 disabled:opacity-40'
  return (
    <div className="flex shrink-0 gap-1">
      <button
        type="button"
        title={canUndo ? `Undo ${undoLabel ?? ''} (${MOD}Z)` : 'Nothing to undo'}
        disabled={!canUndo}
        onClick={undo}
        className={button}
      >
        Undo
      </button>
      <button
        type="button"
        title={canRedo ? `Redo ${redoLabel ?? ''} (${MOD}Shift+Z)` : 'Nothing to redo'}
        disabled={!canRedo}
        onClick={redo}
        className={button}
      >
        Redo
      </button>
    </div>
  )
}
