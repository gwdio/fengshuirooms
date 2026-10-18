import { isElementTool, useEditorStore, type Tool } from '../state/editorStore.ts'
import { PALETTE } from './palette.ts'

// The editor's top-level tools, shown as toolbar buttons with their shortcut. Each one is a mode
// the editor can be in; add new ones (e.g. grouping) here and they get a button and a key.
// A tool may cover several low-level `Tool` states: Place is active for any element tool.

export interface EditorTool {
  id: string
  /** Button text; may depend on state (Place shows what it will place). */
  label: (state: { lastElement: Tool }) => string
  /** Shortcut chord, shown on the button. */
  key: string
  description: string
  isActive: (tool: Tool) => boolean
  activate: () => void
}

export const EDITOR_TOOLS: readonly EditorTool[] = [
  {
    id: 'select',
    label: () => 'Select',
    key: 'v',
    description: 'Select and move walls, doors, and windows',
    isActive: (tool) => tool === 'select',
    activate: () => useEditorStore.getState().setTool('select'),
  },
  {
    id: 'place',
    label: ({ lastElement }) =>
      `Place · ${PALETTE.find((p) => p.tool === lastElement)?.label ?? lastElement}`,
    key: 'p',
    description: 'Place the last used element (pick another in the elements panel, or ↑/↓)',
    isActive: isElementTool,
    activate: () => {
      const { lastElement, setTool } = useEditorStore.getState()
      setTool(lastElement)
    },
  },
]
