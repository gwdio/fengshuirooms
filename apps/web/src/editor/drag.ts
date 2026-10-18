import {
  moveCorner,
  slideOpening,
  translateWalls,
  type Point,
  type SnapResult,
  type TranslationSnap,
  type Wall,
} from '@space-planner/core'
import { create } from 'zustand'
import { onChanges } from '../doc/docStore.ts'

// In-progress edit drags. The document only changes on drop (one commit per drag, ready for undo);
// until then the walls layer renders `previewWalls`, built with the same core function as the commit.
export type EditDrag =
  | {
      kind: 'corner'
      from: Point
      /** Walls whose endpoint at `from` moves; other walls at that corner stay put. */
      wallIds: string[]
      snap: SnapResult | null
    }
  | {
      kind: 'walls'
      ids: string[]
      /** Pointer position (stage px) when the drag started. */
      startScreen: Point
      snap: TranslationSnap | null
      /** Pointer is off the canvas: dropping now deletes (ElementsPanel shows the zone). */
      outside: boolean
    }
  | {
      /** A single door or window sliding along its wall. */
      kind: 'slide'
      id: string
      startScreen: Point
      /** Where the opening's centre would go. */
      center: Point | null
      outside: boolean
    }

export const useEditDrag = create<{ drag: EditDrag | null }>()(() => ({ drag: null }))

export function setDrag(drag: EditDrag | null) {
  useEditDrag.setState({ drag })
}

/** Ids that releasing the current drag would delete (it's been dragged off the canvas). */
export function pendingDeleteIds(drag: EditDrag | null): readonly string[] {
  if (!drag || drag.kind === 'corner' || !drag.outside) return []
  return drag.kind === 'walls' ? drag.ids : [drag.id]
}

/** The walls as they would be if the current drag were dropped now. */
export function previewWalls(walls: readonly Wall[], drag: EditDrag | null): readonly Wall[] {
  if (!drag) return walls
  switch (drag.kind) {
    case 'corner':
      return drag.snap ? moveCorner(walls, drag.from, drag.snap.point, drag.wallIds) : walls
    // While armed to delete (outside), the dragged items stay where they started, drawn as
    // pending deletion (pendingDeleteIds). They must stay mounted: unmounting the Konva node being
    // dragged ends the drag.
    case 'walls':
      if (drag.outside) return walls
      return drag.snap ? translateWalls(walls, drag.ids, drag.snap.delta) : walls
    case 'slide':
      if (drag.outside) return walls
      return (drag.center && slideOpening(walls, drag.id, drag.center)) || walls
  }
}

// If something we're dragging is changed or deleted from elsewhere (a load, undo, or later a peer),
// abandon the drag rather than drop stale geometry over the new state.
onChanges(({ origin, changes }) => {
  const { drag } = useEditDrag.getState()
  if (!drag || origin === 'local') return
  const ids = new Set(
    drag.kind === 'corner' ? drag.wallIds : drag.kind === 'walls' ? drag.ids : [drag.id],
  )
  if (changes.some((c) => ids.has(c.id))) setDrag(null)
})
