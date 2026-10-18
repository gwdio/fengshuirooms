import { formatLength, wallLength } from '@space-planner/core'
import { useMeta } from '../doc/meta.ts'
import { useSelection } from '../state/selectionStore.ts'
import { flipDoor, useWalls } from '../walls/walls.ts'

const KIND_NAMES = { wall: 'Wall', door: 'Door', window: 'Window' } as const

export function PropertiesPanel() {
  const selectedIds = useSelection((s) => s.selectedIds)
  const walls = useWalls()
  const { units } = useMeta()
  const single = selectedIds.length === 1 ? walls.find((w) => w.id === selectedIds[0]) : undefined

  return (
    <aside className="w-64 shrink-0 space-y-3 border-l border-gray-200 bg-gray-50 p-3 text-sm text-gray-500">
      <p>{selectedIds.length === 0 ? 'Nothing selected' : `${selectedIds.length} selected`}</p>
      {single && (
        <div className="space-y-2 text-gray-800">
          <p>
            <span className="font-medium">{KIND_NAMES[single.kind]}</span>{' '}
            {formatLength(wallLength(single), units)}
          </p>
          {single.kind === 'door' && (
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-100"
                onClick={() => flipDoor(single.id, 'hinge')}
              >
                Flip hinge
              </button>
              <button
                type="button"
                className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-100"
                onClick={() => flipDoor(single.id, 'swing')}
              >
                Flip swing
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
