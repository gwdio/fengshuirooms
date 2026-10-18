import { create } from 'zustand'

// Editor UI state. Not part of the document or undo history. snapToGrid and lastElement are
// saved per browser (registered as local settings in boot.ts).
export type Tool = 'select' | 'wall' | 'door' | 'window'
/** Tools that place something: the elements panel's entries. */
export type ElementTool = Exclude<Tool, 'select'>

interface EditorState {
  tool: Tool
  /** Global grid snap. Holding Shift inverts it for the current gesture. */
  snapToGrid: boolean
  /** The element most recently picked or dropped; P ("place") returns to it. */
  lastElement: ElementTool
  setTool: (tool: Tool) => void
  /** Records an element as used without switching to it (e.g. dragged in from the panel). */
  noteElementUsed: (element: ElementTool) => void
  toggleSnapToGrid: () => void
}

export const useEditorStore = create<EditorState>()((set) => ({
  tool: 'select',
  snapToGrid: true,
  lastElement: 'wall',
  setTool: (tool) => set(tool === 'select' ? { tool } : { tool, lastElement: tool }),
  noteElementUsed: (lastElement) => set({ lastElement }),
  toggleSnapToGrid: () => set((s) => ({ snapToGrid: !s.snapToGrid })),
}))

export function isElementTool(v: unknown): v is ElementTool {
  return v === 'wall' || v === 'door' || v === 'window'
}
