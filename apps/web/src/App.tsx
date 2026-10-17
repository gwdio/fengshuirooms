import { EditorCanvas } from './editor/EditorCanvas.tsx'
import { CatalogPanel } from './panels/CatalogPanel.tsx'
import { PropertiesPanel } from './panels/PropertiesPanel.tsx'
import { usePlanStore } from './state/planStore.ts'

export default function App() {
  const units = usePlanStore((s) => s.plan.units)
  const setUnits = usePlanStore((s) => s.setUnits)

  return (
    <div className="flex h-full flex-col text-gray-900">
      <header className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
        <h1 className="font-semibold">Space Planner</h1>
        <button
          type="button"
          className="rounded border border-gray-300 px-2 py-1 text-sm hover:bg-gray-100"
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
