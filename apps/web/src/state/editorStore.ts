import { create } from 'zustand'

// Editor UI state. Not part of the document or undo history. snapToGrid and lastElement are
// saved per browser (registered as local settings in boot.ts).
export type Tool = 'select' | 'pan' | 'wall' | 'door' | 'window'
/** Tools that place something: the elements panel's entries. */
export type ElementTool = Exclude<Tool, 'select' | 'pan'>

interface EditorState {
  tool: Tool
  /** Global grid snap. Holding Shift inverts it for the current gesture. */
  snapToGrid: boolean
  /** The element most recently picked or dropped; P ("place") returns to it. */
  lastElement: ElementTool
  /** The tool to return to when Pan is toggled off. */
  toolBeforePan: Tool
  setTool: (tool: Tool) => void
  /** Pan on (remembering the current tool), or back to that tool. */
  togglePan: () => void
  /** Records an element as used without switching to it (e.g. dragged in from the panel). */
  noteElementUsed: (element: ElementTool) => void
  toggleSnapToGrid: () => void
}

export const useEditorStore = create<EditorState>()((set) => ({
  tool: 'select',
  snapToGrid: true,
  lastElement: 'wall',
  toolBeforePan: 'select',
  setTool: (tool) => set(isElementTool(tool) ? { tool, lastElement: tool } : { tool }),
  togglePan: () =>
    set((s) =>
      s.tool === 'pan' ? { tool: s.toolBeforePan } : { tool: 'pan', toolBeforePan: s.tool },
    ),
  noteElementUsed: (lastElement) => set({ lastElement }),
  toggleSnapToGrid: () => set((s) => ({ snapToGrid: !s.snapToGrid })),
}))

export function isElementTool(v: unknown): v is ElementTool {
  return v === 'wall' || v === 'door' || v === 'window'
}
