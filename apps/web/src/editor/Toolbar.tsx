import { useHeldKey } from '../input/useKeyboard.ts'
import { useEditorStore, type Tool } from '../state/editorStore.ts'

const TOOLS: { id: Tool; label: string; key: string; hint: string }[] = [
  {
    id: 'select',
    label: 'Select',
    key: 'V',
    hint: 'Click a wall to select · drag a wall to move it on its own · drag a corner to move every wall there (only the selected walls, if any) · Delete removes',
  },
  {
    id: 'wall',
    label: 'Wall',
    key: 'W',
    hint: 'Click corners or drag a wall · start or end on any wall · click the start to close · double-click / Enter to finish · Backspace undoes last wall · Esc exits',
  },
]

export function Toolbar() {
  const tool = useEditorStore((s) => s.tool)
  const setTool = useEditorStore((s) => s.setTool)
  const snapToGrid = useEditorStore((s) => s.snapToGrid)
  const toggleSnapToGrid = useEditorStore((s) => s.toggleSnapToGrid)
  // What snapping will actually do right now, with Shift's inversion applied.
  const gridActive = snapToGrid !== useHeldKey('Shift')
  const hint = TOOLS.find((t) => t.id === tool)?.hint

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex shrink-0 gap-1">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            title={`${t.label} (${t.key})`}
            aria-pressed={tool === t.id}
            onClick={() => setTool(t.id)}
            className={`rounded border px-2 py-1 text-sm ${
              tool === t.id
                ? 'border-teal-700 bg-teal-700 text-white'
                : 'border-gray-300 hover:bg-gray-100'
            }`}
          >
            {t.label} <span className="opacity-60">{t.key}</span>
          </button>
        ))}
      </div>
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
      <p className="truncate text-xs text-gray-500">{hint}</p>
    </div>
  )
}
