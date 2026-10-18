import { redo, undo } from '../doc/history.ts'
import { useKeyBindings } from '../input/useKeyboard.ts'
import { useEditorStore } from '../state/editorStore.ts'
import { useSelection } from '../state/selectionStore.ts'
import { deleteSegments } from '../walls/walls.ts'
import { EDITOR_TOOLS } from './editorTools.ts'

/** App-wide editor shortcuts. Tool-specific keys are registered by the tool itself. */
export function useEditorShortcuts() {
  useKeyBindings([
    {
      keys: ['Mod+z'],
      description: 'Undo',
      allowRepeat: true,
      run: undo,
    },
    {
      keys: ['Mod+Shift+z', 'Mod+y'],
      description: 'Redo',
      allowRepeat: true,
      run: redo,
    },
    ...EDITOR_TOOLS.map((t) => ({ keys: [t.key], description: t.description, run: t.activate })),
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
        useSelection.getState().selectedIds.length > 0,
      run: () => {
        deleteSegments(useSelection.getState().selectedIds)
      },
    },
    {
      keys: ['Escape'],
      description: 'Clear selection',
      when: () => useSelection.getState().selectedIds.length > 0,
      run: () => useSelection.getState().select([]),
    },
  ])
}
