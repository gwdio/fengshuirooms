import { useKeyBindings } from '../input/useKeyboard.ts'
import { useEditorStore } from '../state/editorStore.ts'
import { usePlanStore } from '../state/planStore.ts'

/** App-wide editor shortcuts. Tool-specific keys are registered by the tool itself. */
export function useEditorShortcuts() {
  useKeyBindings([
    {
      keys: ['v'],
      description: 'Select tool',
      run: () => useEditorStore.getState().setTool('select'),
    },
    {
      keys: ['w'],
      description: 'Wall tool',
      run: () => useEditorStore.getState().setTool('wall'),
    },
    {
      keys: ['g'],
      description: 'Toggle grid snap',
      run: () => useEditorStore.getState().toggleSnapToGrid(),
    },
    {
      keys: ['Delete', 'Backspace'],
      description: 'Delete selection',
      when: () =>
        useEditorStore.getState().tool === 'select' &&
        usePlanStore.getState().selectedIds.length > 0,
      run: () => {
        const { selectedIds, removeWalls } = usePlanStore.getState()
        removeWalls(selectedIds)
      },
    },
    {
      keys: ['Escape'],
      description: 'Clear selection',
      when: () => usePlanStore.getState().selectedIds.length > 0,
      run: () => usePlanStore.getState().select([]),
    },
  ])
}
