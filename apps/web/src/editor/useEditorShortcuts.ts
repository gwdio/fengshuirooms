import { redo, undo } from '../doc/history.ts'
import { PRIORITY } from '../input/keyboard.ts'
import { useKeyBindings } from '../input/useKeyboard.ts'
import { useEditorStore } from '../state/editorStore.ts'
import { useSelection } from '../state/selectionStore.ts'
import { deleteSegments } from '../walls/walls.ts'
import { EDITOR_TOOLS } from './editorTools.ts'
import { fitToPlan, resetZoom, zoomBy } from './viewport.ts'

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
    ...EDITOR_TOOLS.filter((t) => t.bindKey !== false).map((t) => ({
      keys: [t.key],
      description: t.description,
      run: t.activate,
    })),
    {
      keys: ['Mod+=', 'Mod++', 'Mod+Shift++'],
      description: 'Zoom in',
      allowRepeat: true,
      run: () => zoomBy(1.25),
    },
    {
      keys: ['Mod+-'],
      description: 'Zoom out',
      allowRepeat: true,
      run: () => zoomBy(1 / 1.25),
    },
    { keys: ['Mod+0'], description: 'Zoom to 100%', run: resetZoom },
    { keys: ['Shift+!', 'Shift+1'], description: 'Fit plan to view', run: fitToPlan },
    {
      // Space drives the Pan tool (panTool.ts: tap toggles, hold pans briefly). Claimed here so it
      // doesn't scroll the page or press a focused button.
      keys: ['Space'],
      description: 'Hold to pan',
      allowRepeat: true,
      run: () => {},
    },
    {
      keys: ['Escape'],
      description: 'Leave the Pan tool',
      priority: PRIORITY.tool,
      when: () => useEditorStore.getState().tool === 'pan',
      run: () => useEditorStore.getState().togglePan(),
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
