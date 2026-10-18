import { useSelection } from '../state/selectionStore.ts'

export function PropertiesPanel() {
  const selectedIds = useSelection((s) => s.selectedIds)
  return (
    <aside className="w-64 shrink-0 border-l border-gray-200 bg-gray-50 p-3 text-sm text-gray-500">
      {selectedIds.length === 0 ? 'Nothing selected' : `${selectedIds.length} selected`}
    </aside>
  )
}
