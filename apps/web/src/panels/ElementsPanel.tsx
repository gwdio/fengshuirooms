import { PALETTE, stepEntry, type PaletteEntry } from '../editor/palette.ts'
import { useEditDrag } from '../editor/drag.ts'
import { PRIORITY } from '../input/keyboard.ts'
import { useKeyBindings } from '../input/useKeyboard.ts'
import { isElementTool, useEditorStore } from '../state/editorStore.ts'
import { beginPaletteDrag, cancelPaletteDrag, usePaletteDrag } from '../state/paletteDrag.ts'

// Left side panel. Tabs are ready for more groups (furniture, …); for now there's one tab with
// everything. Entries: click to pick the tool, drag onto the canvas to drop one in. Dragging
// something off the canvas deletes it; while that's armed this panel shows a delete zone.

const TABS = [{ id: 'elements', label: 'Elements', entries: PALETTE }] as const

export function ElementsPanel() {
  const tool = useEditorStore((s) => s.tool)
  const paletteDrag = usePaletteDrag((s) => s.drag)
  const deleting = useEditDrag((s) => (s.drag && 'outside' in s.drag ? s.drag.outside : false))
  const tab = TABS[0]

  useKeyBindings([
    // For now every Up/Down goes to this panel. When other things want arrows (nudging, lists),
    // route by focus/context here instead of growing this.
    {
      keys: ['ArrowUp'],
      description: 'Previous element',
      allowRepeat: true,
      run: () => stepElement(-1),
    },
    {
      keys: ['ArrowDown'],
      description: 'Next element',
      allowRepeat: true,
      run: () => stepElement(1),
    },
    {
      keys: ['Escape'],
      description: 'Cancel dragging from the panel',
      priority: PRIORITY.modal,
      when: () => usePaletteDrag.getState().drag !== null,
      run: cancelPaletteDrag,
    },
  ])

  return (
    <aside className="relative flex w-56 shrink-0 flex-col border-r border-gray-200 bg-gray-50">
      <div role="tablist" className="flex border-b border-gray-200 px-2 pt-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={t.id === tab.id}
            className="rounded-t border border-b-0 border-gray-200 bg-white px-3 py-1 text-xs font-semibold tracking-wide text-gray-600 uppercase"
          >
            {t.label}
          </button>
        ))}
      </div>
      <ul className="space-y-1 p-2" role="tabpanel">
        {tab.entries.map((entry) => (
          <PaletteItem key={entry.id} entry={entry} active={tool === entry.tool} />
        ))}
      </ul>
      <p className="space-y-1 px-3 text-xs text-gray-400">
        <span className="block">P: place the last used element · ↑/↓: switch element</span>
        <span className="block">Drag something off the canvas to delete it.</span>
      </p>

      {deleting && (
        <div
          data-delete-zone
          className="absolute inset-0 flex items-center justify-center border-2 border-dashed border-red-400 bg-red-50/90 text-sm font-medium text-red-700"
        >
          Release to delete
        </div>
      )}
      {paletteDrag?.dragging && (
        <DragChip entryId={paletteDrag.entryId} x={paletteDrag.client.x} y={paletteDrag.client.y} />
      )}
    </aside>
  )
}

function PaletteItem({ entry, active }: { entry: PaletteEntry; active: boolean }) {
  return (
    <li>
      <button
        type="button"
        data-palette={entry.id}
        title={entry.description}
        aria-pressed={active}
        onPointerDown={(e) => {
          if (e.button !== 0) return
          e.preventDefault() // no text selection or native drag while dragging out
          beginPaletteDrag(entry.id, { x: e.clientX, y: e.clientY })
        }}
        className={`flex w-full cursor-grab touch-none items-center gap-2 rounded border px-2 py-2 text-left text-sm select-none ${
          active
            ? 'border-teal-700 bg-teal-50 text-teal-900'
            : 'border-gray-200 bg-white hover:bg-gray-100'
        }`}
      >
        <Icon id={entry.id} />
        <span>
          <span className="block font-medium">{entry.label}</span>
          <span className="block text-xs text-gray-500">{entry.description}</span>
        </span>
      </button>
    </li>
  )
}

function DragChip({ entryId, x, y }: { entryId: string; x: number; y: number }) {
  const entry = PALETTE.find((p) => p.id === entryId)
  return (
    <div
      className="pointer-events-none fixed z-50 flex items-center gap-1 rounded border border-teal-700 bg-white px-2 py-1 text-xs shadow"
      style={{ left: x + 12, top: y + 12 }}
    >
      <Icon id={entryId} /> {entry?.label}
    </div>
  )
}

function Icon({ id }: { id: string }) {
  const common = { width: 28, height: 20, viewBox: '0 0 28 20', 'aria-hidden': true }
  if (id === 'wall') {
    return (
      <svg {...common}>
        <rect x="2" y="8" width="24" height="4" fill="#374151" />
      </svg>
    )
  }
  if (id === 'door') {
    return (
      <svg {...common} fill="none" stroke="#475569">
        <rect x="0" y="16" width="6" height="3" fill="#374151" stroke="none" />
        <rect x="22" y="16" width="6" height="3" fill="#374151" stroke="none" />
        <path d="M6 17.5V2" strokeWidth="1.5" />
        <path d="M6 2A15.5 15.5 0 0 1 21.5 17.5" strokeDasharray="2 2" />
      </svg>
    )
  }
  return (
    <svg {...common} fill="none" stroke="#0284c7">
      <rect x="0" y="8" width="6" height="4" fill="#374151" stroke="none" />
      <rect x="22" y="8" width="6" height="4" fill="#374151" stroke="none" />
      <path d="M6 9H22M6 11H22" strokeWidth="1" />
    </svg>
  )
}

/** Up/Down: from an element tool, move to the previous/next entry; from Select, act like P. */
function stepElement(direction: 1 | -1) {
  const { tool, lastElement, setTool } = useEditorStore.getState()
  setTool(isElementTool(tool) ? stepEntry(tool, direction).tool : lastElement)
}
