import {
  moveCorner,
  translateWalls,
  type Plan,
  type Point,
  type SnapResult,
  type TranslationSnap,
} from '@space-planner/core'
import { create } from 'zustand'

// In-progress edit drags. The plan only changes on drop (one commit per drag, ready for undo);
// until then the walls layer renders `previewPlan`, built with the same core function as the commit.
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
    }

export const useEditDrag = create<{ drag: EditDrag | null }>()(() => ({ drag: null }))

export function setDrag(drag: EditDrag | null) {
  useEditDrag.setState({ drag })
}

/** The plan as it would look if the current drag were dropped now. */
export function previewPlan(plan: Plan, drag: EditDrag | null): Plan {
  if (!drag?.snap) return plan
  return drag.kind === 'corner'
    ? moveCorner(plan, drag.from, drag.snap.point, drag.wallIds)
    : translateWalls(plan, drag.ids, drag.snap.delta)
}
