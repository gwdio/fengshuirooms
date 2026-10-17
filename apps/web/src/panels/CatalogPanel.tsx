import { catalog } from '@space-planner/core'

export function CatalogPanel() {
  return (
    <aside className="w-56 shrink-0 overflow-y-auto border-r border-gray-200 bg-gray-50 p-3">
      <h2 className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">
        Furniture
      </h2>
      <ul className="space-y-1 text-sm">
        {catalog.items.map((item) => (
          <li key={item.id} className="rounded px-2 py-1 hover:bg-gray-200">
            {item.name}
          </li>
        ))}
      </ul>
    </aside>
  )
}
