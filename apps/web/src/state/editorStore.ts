import { create } from 'zustand'

// Transient editor UI state. Never persisted, never part of undo history.
export type Tool = 'select' | 'wall'

interface EditorState {
  tool: Tool
  /** Global grid snap. Holding Shift inverts it for the current gesture. */
  snapToGrid: boolean
  setTool: (tool: Tool) => void
  toggleSnapToGrid: () => void
}

export const useEditorStore = create<EditorState>()((set) => ({
  tool: 'select',
  snapToGrid: true,
  setTool: (tool) => set({ tool }),
  toggleSnapToGrid: () => set((s) => ({ snapToGrid: !s.snapToGrid })),
}))
