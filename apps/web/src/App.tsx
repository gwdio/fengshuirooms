import { EditorCanvas } from './editor/EditorCanvas.tsx'
import { Toolbar } from './editor/Toolbar.tsx'
import { useEditorShortcuts } from './editor/useEditorShortcuts.ts'
import { useKeyboardRoot } from './input/useKeyboard.ts'
import { CatalogPanel } from './panels/CatalogPanel.tsx'
import { PropertiesPanel } from './panels/PropertiesPanel.tsx'
import { usePlanStore } from './state/planStore.ts'

export default function App() {
  const units = usePlanStore((s) => s.plan.units)
  const setUnits = usePlanStore((s) => s.setUnits)
  useKeyboardRoot()
  useEditorShortcuts()

  return (
    <div className="flex h-full flex-col text-gray-900">
      <header className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
        <div className="flex min-w-0 items-center gap-6">
          <h1 className="shrink-0 font-semibold">Space Planner</h1>
          <Toolbar />
        </div>
        <button
          type="button"
          className="shrink-0 rounded border border-gray-300 px-2 py-1 text-sm hover:bg-gray-100"
          onClick={() => setUnits(units === 'imperial' ? 'metric' : 'imperial')}
        >
          {units === 'imperial' ? 'ft / in' : 'm / cm'}
        </button>
      </header>
      <main className="flex min-h-0 flex-1">
        <CatalogPanel />
        <div className="min-w-0 flex-1">
          <EditorCanvas />
        </div>
        <PropertiesPanel />
      </main>
    </div>
  )
}
