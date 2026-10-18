import { create } from 'zustand'
import { onChanges } from '../doc/docStore.ts'

// Selected entity ids. Not part of the document: never saved or synced.
interface SelectionState {
  selectedIds: string[]
  select: (ids: string[]) => void
}

export const useSelection = create<SelectionState>()((set) => ({
  selectedIds: [],
  select: (selectedIds) => set({ selectedIds }),
}))

/** Follows merges: selected ids that were absorbed into another entity select the survivor. */
export function remapSelection(replaced: ReadonlyMap<string, string>): void {
  if (replaced.size === 0) return
  const { selectedIds } = useSelection.getState()
  const next = [...new Set(selectedIds.map((id) => replaced.get(id) ?? id))]
  useSelection.setState({ selectedIds: next })
}

// Anything deleted, by a local edit, a load, or a peer, stops being selected.
onChanges(({ changes }) => {
  const deleted = new Set(changes.filter((c) => c.value === null).map((c) => c.id))
  if (deleted.size === 0) return
  const { selectedIds } = useSelection.getState()
  if (selectedIds.some((id) => deleted.has(id))) {
    useSelection.setState({ selectedIds: selectedIds.filter((id) => !deleted.has(id)) })
  }
})
